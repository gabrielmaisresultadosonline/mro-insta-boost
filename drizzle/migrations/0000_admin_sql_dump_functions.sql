-- Helper functions used ONLY by the admin dump edge function (service_role).

CREATE OR REPLACE FUNCTION public.admin_list_public_tables()
RETURNS TABLE(table_name text, row_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  c bigint;
BEGIN
  FOR r IN
    SELECT t.table_name AS tname
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.tname) INTO c;
    table_name := r.tname;
    row_count := c;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dump_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  out_sql text := '';
  cols text;
  pk text;
BEGIN
  FOR r IN
    SELECT t.table_name AS tname
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    SELECT string_agg(
      format('  %I %s%s%s',
        c.column_name,
        c.data_type ||
          CASE WHEN c.data_type IN ('character varying','character') AND c.character_maximum_length IS NOT NULL
               THEN '(' || c.character_maximum_length || ')' ELSE '' END,
        CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END,
        CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
      ), E',\n' ORDER BY c.ordinal_position)
    INTO cols
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = r.tname;

    SELECT string_agg(format('%I', a.attname), ', ' ORDER BY x.ord)
    INTO pk
    FROM pg_constraint con
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS x(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = x.attnum
    WHERE con.conrelid = format('public.%I', r.tname)::regclass AND con.contype = 'p';

    out_sql := out_sql || format(E'CREATE TABLE IF NOT EXISTS public.%I (\n%s%s\n);\n\n',
      r.tname,
      cols,
      CASE WHEN pk IS NOT NULL THEN E',\n  PRIMARY KEY (' || pk || ')' ELSE '' END);
  END LOOP;

  RETURN out_sql;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dump_table_rows(p_table text, p_offset integer, p_limit integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  col_list text;
  col_arr text[];
  q text;
  res text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = p_table
  ) THEN
    RETURN '';
  END IF;

  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position),
         array_agg(column_name::text ORDER BY ordinal_position)
  INTO col_list, col_arr
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table;

  IF col_list IS NULL THEN RETURN ''; END IF;

  q := format(
    'SELECT coalesce(string_agg(stmt, E''\n''), '''') FROM (
       SELECT ''INSERT INTO public.%I ('' || %L || '') VALUES ('' ||
         (SELECT string_agg(
            CASE WHEN (to_jsonb(t) ->> u.c) IS NULL THEN ''NULL''
                 ELSE quote_literal(to_jsonb(t) ->> u.c) END, '', '' ORDER BY u.ord)
          FROM unnest(%L::text[]) WITH ORDINALITY AS u(c, ord))
         || '') ON CONFLICT DO NOTHING;'' AS stmt
       FROM public.%I t
       ORDER BY 1
       OFFSET %s LIMIT %s
     ) s',
    p_table, col_list, col_arr, p_table, greatest(coalesce(p_offset, 0), 0), least(greatest(coalesce(p_limit, 500), 1), 5000)
  );

  EXECUTE q INTO res;
  RETURN coalesce(res, '');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_public_tables() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_dump_schema() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_dump_table_rows(text, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_public_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_dump_schema() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_dump_table_rows(text, integer, integer) TO service_role;