import "./styles.css";
import { transformAlgorithm } from "./transforms/index.js";

const puzzles = [
  { id: "3x3", label: "3x3" },
  { id: "square1", label: "스퀘어-1" },
  { id: "fto", label: "FTO" },
];

const outputTypes = {
  inverse: "역공식",
  mirrorLeftRight: "좌우대칭",
  mirrorLeftRightInverse: "좌우대칭의 역공식",
  mirrorFrontBack: "전후대칭",
  mirrorFrontBackInverse: "전후대칭의 역공식",
  mirrorUpDown: "상하대칭",
  mirrorUpDownInverse: "상하대칭의 역공식",
};

const outputCardsByPuzzle = {
  "3x3": [
    { title: "역공식", types: ["inverse"] },
    { title: "좌우대칭", types: ["mirrorLeftRight", "mirrorLeftRightInverse"] },
    { title: "전후대칭", types: ["mirrorFrontBack", "mirrorFrontBackInverse"] },
    { title: "상하대칭", types: ["mirrorUpDown", "mirrorUpDownInverse"] },
  ],
  square1: [
    { title: "역공식", types: ["inverse"] },
    { title: "전후대칭", types: ["mirrorFrontBack", "mirrorFrontBackInverse"] },
    { title: "상하대칭", types: ["mirrorUpDown", "mirrorUpDownInverse"] },
  ],
  fto: [
    { title: "역공식", types: ["inverse"] },
    { title: "좌우대칭", types: ["mirrorLeftRight", "mirrorLeftRightInverse"] },
    { title: "전후대칭", types: ["mirrorFrontBack", "mirrorFrontBackInverse"] },
  ],
};

const state = {
  selectedPuzzle: "3x3",
  inputAlgorithm: "",
  visibleOutputCards: outputCardsByPuzzle["3x3"],
  outputs: null,
  errorMessage: "",
};

const app = document.querySelector("#app");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getOutputCardsForPuzzle(puzzle) {
  return outputCardsByPuzzle[puzzle] ?? outputCardsByPuzzle["3x3"];
}

function renderPuzzleOptions() {
  return puzzles
    .map(
      (puzzle) => `
        <label class="puzzle-option">
          <input
            type="radio"
            name="puzzle"
            value="${puzzle.id}"
            ${state.selectedPuzzle === puzzle.id ? "checked" : ""}
          />
          <span>${puzzle.label}</span>
        </label>
      `,
    )
    .join("");
}

function getOutputDisplay(type) {
  if (state.selectedPuzzle !== "3x3") {
    return {
      value: "",
      message: "변환 규칙 준비 중",
      isError: false,
    };
  }

  if (state.errorMessage) {
    return {
      value: "",
      message: state.errorMessage,
      isError: true,
    };
  }

  const value = state.outputs?.[type] ?? "";

  return {
    value,
    message: value || "공식을 입력하세요",
    isError: false,
  };
}

function renderOutputs() {
  return state.visibleOutputCards
    .map((card) => renderOutputCard(card))
    .join("");
}

function renderOutputCard(card) {
  const values = card.types.map((type) => renderOutputValue(type)).join("");

  return `
    <section class="output-card" aria-labelledby="${card.types[0]}-title">
      <div class="output-card__header">
        <h2 id="${card.types[0]}-title">${card.title}</h2>
      </div>
      ${values}
    </section>
  `;
}

function renderOutputValue(type) {
  const output = getOutputDisplay(type);

  return `
    <div class="output-item">
      <div class="output-item__header">
        <h3>${outputTypes[type]}</h3>
        <button
          class="copy-button"
          type="button"
          data-copy="${type}"
          ${output.value ? "" : "disabled"}
          aria-label="${outputTypes[type]} 복사"
          title="${outputTypes[type]} 복사"
        >
          복사
        </button>
      </div>
      <output class="output-value ${output.isError ? "output-value--error" : ""}" for="algorithm-input">${escapeHtml(output.message)}</output>
    </div>
  `;
}

function render() {
  state.visibleOutputCards = getOutputCardsForPuzzle(state.selectedPuzzle);

  app.innerHTML = `
    <section class="app-shell">
      <header class="app-header">
        <p class="eyebrow">Solution Transfer</p>
        <h1>알고리즘 변환기</h1>
      </header>

      <section class="workspace" aria-label="알고리즘 변환 작업 영역">
        <section class="input-panel" aria-label="입력">
          <fieldset class="puzzle-selector">
            <legend>퍼즐 선택</legend>
            <div class="puzzle-options">
              ${renderPuzzleOptions()}
            </div>
          </fieldset>

          <div class="input-group">
            <label class="input-label" for="algorithm-input">
              공식 입력
              <span class="help-tooltip">
                <button
                  class="help-button"
                  type="button"
                  aria-label="공식 입력 도움말"
                >
                  ?
                </button>
                <span class="help-tooltip__content" role="tooltip">
                  한 줄에 하나의 공식 또는 여러 줄 공식을 입력할 수 있습니다.
                  각 줄은 독립적으로 변환됩니다.

                  지원 예시:
                  R U R' U'
                  F R U R' U' F'
                  Rw U Rw' U'
                  x y' R2 Fw2 M'

                  // 뒤의 내용은 라인 주석으로 처리되어 그대로 출력됩니다.
                  예: R U R' U' // 트위스트
                </span>
              </span>
            </label>
            <textarea
              id="algorithm-input"
              name="algorithm"
              rows="10"
              placeholder="여기에 공식을 입력해 주세요."
            >${escapeHtml(state.inputAlgorithm)}</textarea>
          </div>

          <button class="transform-button" type="button" data-transform>
            변환하기
          </button>
        </section>

        <section class="output-panel" aria-label="출력">
          ${renderOutputs()}
        </section>
      </section>
    </section>
  `;
}

function copyOutput(type) {
  const value = state.outputs?.[type];

  if (!value) {
    return;
  }

  navigator.clipboard?.writeText(value);
}

app.addEventListener("change", (event) => {
  if (event.target.name !== "puzzle") {
    return;
  }

  state.selectedPuzzle = event.target.value;
  state.outputs = null;
  state.errorMessage = "";
  render();
});

app.addEventListener("input", (event) => {
  if (event.target.id !== "algorithm-input") {
    return;
  }

  state.inputAlgorithm = event.target.value;
  state.outputs = null;
  state.errorMessage = "";
  document.querySelector(".output-panel").innerHTML = renderOutputs();
});

app.addEventListener("click", (event) => {
  const transformButton = event.target.closest("[data-transform]");
  if (transformButton) {
    const input = state.inputAlgorithm;

    state.outputs = null;
    state.errorMessage = "";

    if (!input.trim()) {
      document.querySelector(".output-panel").innerHTML = renderOutputs();
      return;
    }

    try {
      state.outputs = transformAlgorithm(state.selectedPuzzle, input);
    } catch (error) {
      state.errorMessage = error.message || "잘못된 입력입니다.";
    }

    document.querySelector(".output-panel").innerHTML = renderOutputs();
    return;
  }

  const button = event.target.closest("[data-copy]");

  if (!button) {
    return;
  }

  copyOutput(button.dataset.copy);
});

render();
