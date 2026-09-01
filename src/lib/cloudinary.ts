/**
 * Adds Cloudinary image transformation parameters for optimal delivery.
 * w_=width, h_=height, c_fill=crop to fill, f_auto=best format, q_auto=best quality
 */
export function cloudinaryUrl(
  url: string | null | undefined,
  width: number,
  height: number,
  options: { crop?: string } = {}
): string {
  if (!url || !url.includes('cloudinary.com')) return url ?? '';
  const crop = options.crop ?? 'fill';
  const transform = `w_${width},h_${height},c_${crop},f_auto,q_auto`;
  return url.replace('/upload/', `/upload/${transform}/`);
}
