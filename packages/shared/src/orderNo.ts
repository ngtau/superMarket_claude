/** D20⑨：订单号格式固化为 YYYYMMDDHHmmss + 4位随机数，共18位，后台不可配置 */
export function generateOrderNo(now: Date = new Date()): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const ts =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${ts}${rand}`;
}
