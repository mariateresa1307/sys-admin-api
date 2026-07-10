// src/audit/utils/get-client-ip.ts

/**
 * Extrae la IP real del cliente de la request
 * Maneja múltiples escenarios: proxy, load balancer, conexión directa
 */
export function getClientIp(req: any): string {
  // 1. Intentar obtener de headers de proxy (más común en producción)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for puede tener múltiples IPs separadas por comas
    // La primera es la IP real del cliente
    const ip = forwardedFor.split(',')[0].trim();
    if (ip && ip !== 'unknown') {
      return normalizeIp(ip);
    }
  }

  // 2. Header x-real-ip (usado por Nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return normalizeIp(realIp);
  }

  // 3. Header cf-connecting-ip (Cloudflare)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    return normalizeIp(cfIp);
  }

  // 4. Header true-client-ip (usado por algunos load balancers)
  const trueClientIp = req.headers['true-client-ip'];
  if (trueClientIp) {
    return normalizeIp(trueClientIp);
  }

  // 5. Express req.ip (requiere trust proxy configurado)
  if (req.ip) {
    return normalizeIp(req.ip);
  }

  // 6. Fallback a connection.remoteAddress
  if (req.connection?.remoteAddress) {
    return normalizeIp(req.connection.remoteAddress);
  }

  // 7. Fallback a socket.remoteAddress
  if (req.socket?.remoteAddress) {
    return normalizeIp(req.socket.remoteAddress);
  }

  return 'Unknown';
}

/**
 * Normaliza la IP (convierte IPv6 localhost a IPv4)
 */
function normalizeIp(ip: string): string {
  // Convertir IPv6 localhost a IPv4
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  // Remover prefijo IPv4-mapped IPv6
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  return ip;
}