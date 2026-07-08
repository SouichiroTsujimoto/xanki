/** Browser / WebView timezone offset in minutes east of UTC. */
export function getTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}
