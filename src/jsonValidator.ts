export function validateJSON(input) {
  try {
    const value = JSON.parse(input);
    return value;
  } catch (e) {
    throw new Error("Error occurred during reading");
  }
}
