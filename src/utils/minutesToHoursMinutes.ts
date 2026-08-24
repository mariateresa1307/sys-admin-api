/*
 * Examples:
 * console.log(convertMinutes(100)); // { hours: 1, minutes: 40 }
 */
export function convertMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes: Number(minutes.toFixed(2)) };
}
