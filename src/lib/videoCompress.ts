const TARGET_MB = 15.5;
const TARGET_BYTES = TARGET_MB * 1024 * 1024;

export type CompressProgress = (pct: number) => void;

export async function compressVideoForWhatsApp(
  file: File,
  onProgress?: CompressProgress
): Promise<File> {
  // Carrega metadados (duração)
  const srcUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = srcUrl;
  video.muted = false;
  video.playsInline = true;

  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error('Erro ao carregar vídeo'));
  });

  const dur = video.duration;
  if (!dur || !isFinite(dur)) {
    URL.revokeObjectURL(srcUrl);
    throw new Error('Não foi possível ler a duração do vídeo');
  }

  const audioBitrate = 64_000;
  const targetBitrate = Math.max(
    250_000,
    Math.floor((TARGET_BYTES * 8) / dur) - audioBitrate
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

  recorder.start(250);
  video.currentTime = 0;
  await video.play();

  let raf = 0;
  const tick = () => {
    if (video.ended || recorder.state === 'inactive') return;
    const pct = Math.min(99, Math.round((video.currentTime / dur) * 100));
    onProgress?.(pct);
    raf = requestAnimationFrame(tick);
  };
  tick();

  await new Promise<void>((res) => {
    video.onended = () => res();
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