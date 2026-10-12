## 2024-10-27 - [Menu Mobile A11y]
**Learning:** O botões de abrir/fechar o menu mobile não possuíam text content e nem atributos de acessibilidade (ARIA) declarados.
**Action:** É importante que botões apenas com ícones semânticos recebam text-content ou aria-labels. Além disso, elementos decorativos, como SVGs, em botões já com labels, devem receber aria-hidden="true" para evitar ruído aos leitores de tela.
