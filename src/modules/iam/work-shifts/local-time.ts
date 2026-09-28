/** An ISO instant's time of day as HH:mm in the server's local time zone. */
export function localTime(instant: string | undefined): string | undefined {
  if (!instant) return undefined;
  const time = new Date(instant);
  return `${pad(time.getHours())}:${pad(time.getMinutes())}`;
}

const pad = (n: number) => String(n).padStart(2, "0");
