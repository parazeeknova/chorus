export function audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result: Float32Array;
  if (numChannels === 2) {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    result = interleave(left, right);
  } else {
    result = audioBuffer.getChannelData(0);
  }

  const dataLength = result.length * (bitDepth / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  floatTo16BitPCM(view, 44, result);

  return arrayBuffer;
}

function interleave(left: Float32Array, right: Float32Array): Float32Array {
  const length = left.length + right.length;
  const result = new Float32Array(length);
  let inputIndex = 0;
  for (let index = 0; index < length; ) {
    result[index++] = left[inputIndex];
    result[index++] = right[inputIndex];
    inputIndex++;
  }
  return result;
}

function floatTo16BitPCM(
  output: DataView,
  offset: number,
  input: Float32Array
): void {
  let currentOffset = offset;
  for (const sampleValue of input) {
    const sample = Math.max(-1, Math.min(1, sampleValue));
    output.setInt16(
      currentOffset,
      sample < 0 ? sample * 0x80_00 : sample * 0x7f_ff,
      true
    );
    currentOffset += 2;
  }
}

export async function blobToWav(blob: Blob): Promise<ArrayBuffer> {
  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBufferToWav(audioBuffer);
  } finally {
    await audioContext.close();
  }
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}
