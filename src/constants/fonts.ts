/** System / bundled stacks + popular Google Fonts (loaded on demand). */
export const SYSTEM_FONTS = [
  "DM Sans",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Comic Sans MS",
] as const;

export const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Merriweather",
  "Playfair Display",
  "Source Sans 3",
  "Nunito",
  "Raleway",
  "Ubuntu",
] as const;

export function googleFontStylesheetUrl(family: string): string {
  const q = family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${q}:wght@400;500;600;700;800&display=swap`;
}

export function loadGoogleFont(family: string, linkId: string): void {
  if ((SYSTEM_FONTS as readonly string[]).includes(family)) return;
  if (document.getElementById(linkId)) return;
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = googleFontStylesheetUrl(family);
  document.head.appendChild(link);
}
