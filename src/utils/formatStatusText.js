// helper function to format status text
export const formatStatusText = (status) => {
  if (!status) return "Unknown";
  // convert underscores to spaces and capitalize each word
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};