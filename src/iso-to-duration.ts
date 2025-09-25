function isoDurationToSeconds(iso: string) {
  const match = iso.match(/PT(\d+)H(\d+)M(\d+)S/);
  if (!match) throw new Error('Formato inválido');
  const [, h, m, s] = match.map(Number);
  return h * 3600 + m * 60 + s;
}
