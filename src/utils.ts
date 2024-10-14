export function get(obj: any, path: string | Array<string | number>, defaultValue?: any): any {
  const keys = Array.isArray(path) ? path : path.split(".").filter(Boolean);
  let result = obj;

  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) {
      return defaultValue;
    }
  }

  return result;
}

export function set(obj: any, path: string | (string | number)[], value: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const pathArray = Array.isArray(path) ? path : path.split(".").map((key) => (key.match(/^\d+$/) ? Number(key) : key));

  let current = obj;

  for (let i = 0; i < pathArray.length; i++) {
    const key = pathArray[i];

    if (i === pathArray.length - 1) {
      current[key] = value;
    } else {
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = typeof pathArray[i + 1] === "number" ? [] : {};
      }
      current = current[key];
    }
  }

  return obj;
}

export function generateId(length: number = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
