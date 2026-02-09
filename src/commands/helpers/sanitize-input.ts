export const sanitizeInput = (input: string) => {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('>', '&gt;')
    .replaceAll('<', '&lt;');
};
