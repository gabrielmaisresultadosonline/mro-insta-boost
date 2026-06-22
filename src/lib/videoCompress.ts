const TARGET_MB = 15.5;
const TARGET_BYTES = TARGET_MB * 1024 * 1024;

export type CompressProgress = (pct: number) => void;

export interface CompressOptions {
  startTime?: number;
  endTime?: number;
  targetMb?: number;
}

export async function compressVideoForWhatsApp(
  file: File,
  onProgress?: CompressProgress,
  options: CompressOptions = {}
): Promise<File> {
  // Carrega metadados (duração)
  const srcUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = srcUrl;
  video.muted = true;
  video.volume = 0;
  video.playsInline = true;

  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error('Erro ao carregar vídeo'));
  });

  const fullDur = video.duration;
  if (!fullDur || !isFinite(fullDur)) {
    URL.revokeObjectURL(srcUrl);
    throw new Error('Não foi possível ler a duração do vídeo');
  }

  const startTime = Math.max(0, Math.min(options.startTime ?? 0, fullDur));
  const endTime = Math.max(startTime + 0.1, Math.min(options.endTime ?? fullDur, fullDur));
  const dur = endTime - startTime;
  const targetBytes = (options.targetMb ?? TARGET_MB) * 1024 * 1024;

  const audioBitrate = 64_000;
  const targetBitrate = Math.max(
    250_000,
    Math.floor((targetBytes * 8) / dur) - audioBitrate
  );

  // captureStream
  // @ts-expect-error captureStream nem sempre está nos types
  const stream: MediaStream = video.captureStream
    // @ts-expect-error
    ? video.captureStream()
    // @ts-expect-error
    : video.mozCaptureStream();

  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const mimeType = candidates.find((c) => MediaRecorder.isTypeSupported(c)) || '';
  if (!mimeType) {
    URL.revokeObjectURL(srcUrl);
    throw new Error('Seu navegador não suporta compressão de vídeo. Use Chrome ou Edge.');
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: targetBitrate,
    audioBitsPerSecond: audioBitrate,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const stopPromise = new Promise<Blob>((res) => {
    recorder.onstop = () => res(new Blob(chunks, { type: mimeType }));
  });

  // Seek até startTime
  await new Promise<void>((res) => {
    const onSeek = () => { video.removeEventListener('seeked', onSeek); res(); };
    video.addEventListener('seeked', onSeek);
    video.currentTime = startTime;
  });

  recorder.start(250);
  await video.play();

  let raf = 0;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    try { video.pause(); } catch {}
  };
  const tick = () => {
    if (finished || recorder.state === 'inactive') return;
    const cur = Math.max(0, video.currentTime - startTime);
    const pct = Math.min(99, Math.round((cur / dur) * 100));
    onProgress?.(pct);
    if (video.currentTime >= endTime || video.ended) {
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  tick();

  await new Promise<void>((res) => {
    const check = () => {
      if (finished) { res(); return; }
      if (video.ended || video.currentTime >= endTime) { finish(); res(); return; }
      setTimeout(check, 100);
    };
    video.onended = () => { finish(); res(); };
    check();
  });
  cancelAnimationFrame(raf);

  if (recorder.state !== 'inactive') recorder.stop();
  const blob = await stopPromise;
  URL.revokeObjectURL(srcUrl);

  onProgress?.(100);

  const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
  const base = file.name.replace(/\.[^.]+$/, '');
  const outName = `${base}-compactado.${ext}`;
  return new File([blob], outName, { type: mimeType });
}