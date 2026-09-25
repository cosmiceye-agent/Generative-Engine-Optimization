/**
 * Applies the saved theme before first paint.
 *
 * This has to be a blocking inline script in <head>: doing it in an effect would
 * paint the wrong theme first and flash. It only ever touches the class list, so
 * the page still renders correctly (following the OS preference) if the script
 * is blocked or localStorage throws in a locked-down browser.
 */
const SCRIPT = `(function(){try{var t=localStorage.getItem("geo-lens-theme");if(t==="dark"||t==="light"){document.documentElement.classList.add(t)}}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
