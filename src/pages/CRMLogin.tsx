 import { useState, useEffect } from 'react';
 import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { Lock, Mail, AlertCircle, User, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

const CRMLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
   const [isRegistering, setIsRegistering] = useState(false);
   const [rememberMe, setRememberMe] = useState(true);
   const location = useLocation();
   useEffect(() => {
     const params = new URLSearchParams(location.search);
     if (params.get('mode') === 'register') {
       setIsRegistering(true);
     }
     // Prefill remembered email
     try {
       const saved = localStorage.getItem('crm_remember_email');
       if (saved) {
         setEmail(saved);
         setRememberMe(true);
       }
     } catch {}
   }, [location]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        // Sign up with Supabase
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              whatsapp_number: whatsapp
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
         if (authData.user) {
           // Check if there are any profiles yet
           const { count } = await supabase
             .from('crm_profiles')
             .select('*', { count: 'exact', head: true });
 
           // The very first registered user becomes super_admin
           const role = (count === 0) ? 'super_admin' : 'user';
 
           // Create profile in crm_profiles
           const { error: profileError } = await supabase
             .from('crm_profiles')
             .insert({
               user_id: authData.user.id,
               full_name: fullName,
               whatsapp_number: whatsapp,
               role: role
             });
           
           if (profileError) console.error("Error creating profile:", profileError);
           
           if (role === 'super_admin') {
             toast({
               title: "Perfil Administrativo Criado!",
               description: "Você foi definido como administrador central por ser o primeiro cadastro.",
             });
           }
         }

        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu e-mail para confirmar a conta (se habilitado).",
        });
        
        // Auto-switch to login after registration success
        setIsRegistering(false);
      } else {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        
        if (authData.user) {
          // Persist or clear remembered email
          try {
            if (rememberMe) {
              localStorage.setItem('crm_remember_email', email);
            } else {
              localStorage.removeItem('crm_remember_email');
            }
          } catch {}
          // Log access
          await supabase.from('crm_access_logs').insert({
            user_id: authData.user.id,
            user_agent: navigator.userAgent
          });
          
          // Check if admin to redirect correctly
          const { data: profile } = await supabase
            .from('crm_profiles')
            .select('role')
            .eq('user_id', authData.user.id)
            .maybeSingle();

          toast({
            title: "Login realizado!",
            description: "Bem-vindo ao CRM Meta SaaS",
          });

          if (profile?.role === 'super_admin') {
            navigate('/admincentral');
          } else {
            navigate('/crm');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center p-4">
       <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 p-8 max-w-md w-full animate-slide-up border border-green-100">
         <div className="flex flex-col items-center mb-8">
           <div className="bg-[#050508] p-5 rounded-3xl mb-4 border border-white/10 shadow-2xl">
             <Logo size="md" />
           </div>
           <h1 className="text-3xl font-display font-black mt-2 text-[#166534] tracking-tight text-center">CRM Meta SaaS</h1>
           <p className="text-green-600/70 font-medium text-sm text-center">Gestão Profissional de WhatsApp</p>
         </div>

         <form onSubmit={handleSubmit} className="space-y-5">
           {error && (
             <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-sm font-medium">
               <AlertCircle className="w-4 h-4 shrink-0" />
               {error}
             </div>
           )}

          {isRegistering && (
            <>
              <div className="space-y-2">
                 <Label htmlFor="fullName" className="flex items-center gap-2 text-green-800 font-semibold text-xs uppercase tracking-wider">
                   <User className="w-3.5 h-3.5" />
                   Nome Completo
                 </Label>
                 <Input
                   id="fullName"
                   value={fullName}
                   onChange={(e) => setFullName(e.target.value)}
                   placeholder="Seu nome completo"
                    className="bg-green-50/50 border-green-100 focus:border-green-400 focus:ring-green-400 h-12 rounded-xl text-black"
                   required={isRegistering}
                 />
              </div>

              <div className="space-y-2">
                 <Label htmlFor="whatsapp" className="flex items-center gap-2 text-green-800 font-semibold text-xs uppercase tracking-wider">
                   <Phone className="w-3.5 h-3.5" />
                   WhatsApp
                 </Label>
                 <Input
                   id="whatsapp"
                   value={whatsapp}
                   onChange={(e) => setWhatsapp(e.target.value)}
                   placeholder="Ex: 5551999999999"
                    className="bg-green-50/50 border-green-100 focus:border-green-400 focus:ring-green-400 h-12 rounded-xl text-black"
                   required={isRegistering}
                 />
              </div>
            </>
          )}

          <div className="space-y-2">
             <Label htmlFor="email" className="flex items-center gap-2 text-green-800 font-semibold text-xs uppercase tracking-wider">
               <Mail className="w-3.5 h-3.5" />
               Email
             </Label>
             <Input
               id="email"
               type="email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               placeholder="Digite seu email"
                className="bg-green-50/50 border-green-100 focus:border-green-400 focus:ring-green-400 h-12 rounded-xl text-black"
               required
             />
          </div>

          <div className="space-y-2">
             <Label htmlFor="password" className="flex items-center gap-2 text-green-800 font-semibold text-xs uppercase tracking-wider">
               <Lock className="w-3.5 h-3.5" />
               Senha
             </Label>
             <Input
               id="password"
               type="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder="Digite sua senha"
                className="bg-green-50/50 border-green-100 focus:border-green-400 focus:ring-green-400 h-12 rounded-xl text-black"
               required
             />
          </div>

          <Button
            type="submit"
             size="lg"
             className="w-full cursor-pointer bg-[#22C55E] hover:bg-[#16A34A] text-white h-12 rounded-xl font-bold text-base shadow-lg shadow-green-200 transition-all active:scale-95"
            disabled={isLoading}
          >
            {isLoading ? 'Processando...' : isRegistering ? 'Criar Minha Conta' : 'Entrar no CRM'}
          </Button>

          {!isRegistering && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(v === true)}
                className="border-green-300 data-[state=checked]:bg-[#22C55E] data-[state=checked]:border-[#22C55E]"
              />
              <span className="text-sm text-green-800 font-medium">
                Manter conectado e memorizar acesso
              </span>
            </label>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
             className="text-sm text-[#16A34A] hover:text-[#15803D] font-bold transition-colors"
          >
            {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se agora'}
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
           Plataforma Segura & Criptografada
        </p>
      </div>
    </div>
  );
};

export default CRMLogin;
