/* -- Gradient text ---------------
  Safari paints a color emoji inside background-clip: text (the .title / .heading / .decorative fill in text.css) as a solid white box: it clips to the glyph's rectangle, not its shape. So text that may hold an emoji is set with this instead of textContent.

  Usage
    <body> end   <script src="/lib/styles/text.js"></script> before the components that use it
    setGradientText(node, text)
      node  an element with .title / .heading / .decorative
      text  its text. Without an emoji this is just node.textContent = text

  Notes
  - With an emoji, node gets .has-emoji (text.css): the gradient moves off the node and onto a span around each run of plain text, so the emoji, in a span of their own, draw as they are
*/

(() => {
  const EMOJI = /((?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}[\p{Emoji_Modifier}️]*(?:‍\p{Extended_Pictographic}[\p{Emoji_Modifier}️]*)*)+)/u;

  window.setGradientText = (node, text) => {
    const parts = text.split(EMOJI);   // odd indexes are the emoji runs
    node.classList.toggle('has-emoji', parts.length > 1);
    if (parts.length === 1) {
      node.textContent = text;
      return;
    }
    node.replaceChildren(...parts.filter(Boolean).map((part) => {
      const span = document.createElement('span');
      span.className = EMOJI.test(part) ? 'emoji' : 'gradient-text';
      span.textContent = part;
      return span;
    }));
  };
})();
