const printButton = document.querySelector('#print-resume');
if (printButton) {
  printButton.hidden = false;
  printButton.addEventListener('click', () => window.print());
}
