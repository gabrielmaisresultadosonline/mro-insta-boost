import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Limite oficial da Meta/WhatsApp para vídeo: 16 MB decimais.
// A compressão mira um pouco abaixo porque MediaRecorder pode gerar overhead no contêiner MP4.
export const WHATSAPP_VIDEO_MAX_BYTES = 16_000_000;
const TARGET_BYTES = 15_500_000;
let ffmpegInstance: FFmpeg | null = null;

export type CompressProgress = (pct: number) => void;

export interface CompressOptions {
  startTime?: number;
  endTime?: number;
  targetMb?: number;
  targetBytes?: number;
  maxBytes?: number;
}

async function getFfmpeg() {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  if (!ffmpegInstance.loaded) {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }

  return ffmpegInstance;
}

async function remuxToProgressiveMp4(file: File, onProgress?: CompressProgress): Promise<File> {
  const ffmpeg = await getFfmpeg();
  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  onProgress?.(97);
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  const exitCode = await ffmpeg.exec([
    '-i', inputName,
    '-map', '0:v:0',
    '-map', '0:a?',
    '-c', 'copy',
    '-movflags', '+faststart',
    '-brand', 'mp42',
    '-f', 'mp4',
    outputName,
  ], 120_000);

  if (exitCode !== 0) {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    await ffmpeg.deleteFile(outputName).catch(() => undefined);
    throw new Error('Não foi possível finalizar o MP4 para envio na Meta. Tente cortar alguns segundos e comprimir novamente.');
  }

  const data = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
  const blob = new Blob([bytes], { type: 'video/mp4' });
  const base = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${base}-meta.mp4`, { type: 'video/mp4' });
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
  const maxBytes = options.maxBytes ?? WHATSAPP_VIDEO_MAX_BYTES;
  let targetBytes = options.targetBytes ?? (options.targetMb ? options.targetMb * 1024 * 1024 : TARGET_BYTES);
  targetBytes = Math.min(targetBytes, Math.floor(maxBytes * 0.98));

  const audioBitrate = 64_000;
  let targetBitrate = Math.max(180_000, Math.floor((targetBytes * 8) / dur) - audioBitrate);

  // captureStream
  // @ts-expect-error captureStream nem sempre está nos types
  const stream: MediaStream = video.captureStream
    // @ts-expect-error
    ? video.captureStream()
    // @ts-expect-error
    : video.mozCaptureStream();

  const candidates = [
    // WhatsApp / Meta só aceita MP4 (H.264 + AAC). Priorizamos Baseline/Main,
    // pois a própria Meta rejeita vídeos H.264 High Profile com B-frames.
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
    'video/mp4',
  ];
  const mimeType = candidates.find((c) => MediaRecorder.isTypeSupported(c)) || '';
  if (!mimeType) {
    URL.revokeObjectURL(srcUrl);
    throw new Error('Seu navegador não suporta compressão em MP4. Use Chrome ou Edge atualizado.');
  }

  const seekTo = (time: number) => new Promise<void>((res) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener('seeked', finish);
      res();
    };
    video.addEventListener('seeked', finish);
    video.currentTime = time;
    setTimeout(finish, 500);
  });

  const encodeOnce = async (videoBitrate: number, attempt: number): Promise<Blob> => {
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: audioBitrate,
    });
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopPromise = new Promise<Blob>((res) => {
      recorder.onstop = () => res(new Blob(chunks, { type: mimeType }));
    });

    await seekTo(startTime);
    // Não use timeslice aqui: chunks parciais geram MP4 fragmentado (vários mdat),
    // que a Meta aceita no upload, mas costuma reprovar depois com "Media upload error".
    recorder.start();
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
      onProgress?.(Math.min(99, attempt === 0 ? pct : Math.max(1, pct)));
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
    return stopPromise;
  };

  let blob = await encodeOnce(targetBitrate, 0);
  for (let attempt = 1; attempt <= 2 && blob.size > maxBytes; attempt += 1) {
    targetBitrate = Math.max(140_000, Math.floor(targetBitrate * (maxBytes / blob.size) * 0.86));
    blob = await encodeOnce(targetBitrate, attempt);
  }
  URL.revokeObjectURL(srcUrl);

  onProgress?.(96);

  const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
  const base = file.name.replace(/\.[^.]+$/, '');
  const outName = `${base}-compactado.${ext}`;
  const encodedFile = new File([blob], outName, { type: ext === 'mp4' ? 'video/mp4' : mimeType });
  const finalFile = ext === 'mp4' ? await remuxToProgressiveMp4(encodedFile, onProgress) : encodedFile;
  onProgress?.(100);
  return finalFile;
}