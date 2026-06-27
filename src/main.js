import "./styles.css";
import { transformAlgorithm } from "./transforms/index.js";

const puzzles = [
  { id: "3x3", label: "3x3" },
  { id: "square1", label: "스퀘어-1" },
  { id: "fto", label: "FTO" },
];

const outputTypes = {
  baseAlgorithm: "기본 공식",
  viewpoint: "사용자 시점",
  viewpointInverse: "사용자 시점의 역공식",
  inverse: "역공식",
  mirrorLeftRight: "좌우대칭",
  mirrorLeftRightInverse: "좌우대칭의 역공식",
  mirrorFrontBack: "전후대칭",
  mirrorFrontBackInverse: "전후대칭의 역공식",
  mirrorUpDown: "상하대칭",
  mirrorUpDownInverse: "상하대칭의 역공식",
};

const faceOrder = ["R", "L", "U", "D", "F", "B"];

const faceColors = {
  U: { name: "하양", key: "white", text: "#4a4a4f" },
  D: { name: "노랑", key: "yellow", text: "#9a7100" },
  R: { name: "빨강", key: "red", text: "#c41212" },
  L: { name: "주황", key: "orange", text: "#c05a00" },
  F: { name: "초록", key: "green", text: "#067133" },
  B: { name: "파랑", key: "blue", text: "#0057ad" },
};

const outputCardsByPuzzle = {
  "3x3": [
    { title: "사용자 시점", type: "viewpoint", inverseType: "viewpointInverse" },
    { title: "좌우대칭", type: "mirrorLeftRight", inverseType: "mirrorLeftRightInverse" },
    { title: "전후대칭", type: "mirrorFrontBack", inverseType: "mirrorFrontBackInverse" },
    { title: "상하대칭", type: "mirrorUpDown", inverseType: "mirrorUpDownInverse" },
  ],
  square1: [
    { title: "역공식", types: ["inverse"] },
    { title: "전후대칭", types: ["mirrorFrontBack", "mirrorFrontBackInverse"] },
    { title: "상하대칭", types: ["mirrorUpDown", "mirrorUpDownInverse"] },
  ],
  fto: [{ title: "역공식", types: ["inverse"] }],
};

const state = {
  selectedPuzzle: "3x3",
  inputAlgorithm: "",
  outputFormat: "compact",
  wideMoveStyle: "wide",
  isSettingsOpen: false,
  visibleOutputCards: outputCardsByPuzzle["3x3"],
  viewpoint: {
    xFace: "U",
    yFace: "F",
  },
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

function getOppositeFace(face) {
  return {
    R: "L",
    L: "R",
    U: "D",
    D: "U",
    F: "B",
    B: "F",
  }[face];
}

function getAdjacentFaces(face) {
  const oppositeFace = getOppositeFace(face);
  return faceOrder.filter((candidate) => candidate !== face && candidate !== oppositeFace);
}

function getFaceLabel(face) {
  return `${face} - ${faceColors[face].name}`;
}

function normalizeViewpointSelection() {
  const availableYFaces = getAdjacentFaces(state.viewpoint.xFace);

  if (!availableYFaces.includes(state.viewpoint.yFace)) {
    state.viewpoint.yFace = availableYFaces[0];
  }
}

function renderFaceBadge(face) {
  const color = faceColors[face];

  return `
    <span class="face-badge face-badge--${color.key}">
      <span class="face-badge__face">${face}</span>
      <span class="face-badge__color">${color.name}</span>
    </span>
  `;
}

function renderFaceOption(face, selectedFace) {
  const color = faceColors[face];

  return `
    <option
      class="face-option face-option--${color.key}"
      value="${face}"
      style="color: ${color.text};"
      ${selectedFace === face ? "selected" : ""}
    >
      ${getFaceLabel(face)}
    </option>
  `;
}

function renderViewpointControl() {
  if (state.selectedPuzzle !== "3x3") {
    return "";
  }

  normalizeViewpointSelection();

  const yFaces = getAdjacentFaces(state.viewpoint.xFace);

  return `
    <section class="viewpoint-control" aria-labelledby="viewpoint-title">
      <h2 id="viewpoint-title">사용자 시점</h2>
      <div class="viewpoint-control__fields">
        <label class="viewpoint-field" for="viewpoint-x">
          <span>X</span>
          <select
            id="viewpoint-x"
            class="face-select face-select--${faceColors[state.viewpoint.xFace].key}"
            name="viewpointX"
          >
            ${faceOrder
    .map((face) => renderFaceOption(face, state.viewpoint.xFace))
    .join("")}
          </select>
        </label>
        <label class="viewpoint-field" for="viewpoint-y">
          <span>Y</span>
          <select
            id="viewpoint-y"
            class="face-select face-select--${faceColors[state.viewpoint.yFace].key}"
            name="viewpointY"
            ${state.viewpoint.xFace ? "" : "disabled"}
          >
            ${yFaces
    .map((face) => renderFaceOption(face, state.viewpoint.yFace))
    .join("")}
          </select>
        </label>
      </div>
      <div class="viewpoint-control__summary" aria-label="선택된 사용자 시점">
        ${renderFaceBadge(state.viewpoint.xFace)}
        <span class="viewpoint-control__arrow">→ U면</span>
        ${renderFaceBadge(state.viewpoint.yFace)}
        <span class="viewpoint-control__arrow">→ F면</span>
      </div>
    </section>
  `;
}

function getInputHelpText() {
  if (state.selectedPuzzle !== "3x3") {
    return "";
  }

  return `한 줄에 하나의 공식 또는 여러 줄 공식을 입력할 수 있습니다.
각 줄은 독립적으로 변환됩니다.

지원 예시:
R U R' U'
F R U R' U' F'
Rw U Rw' U'
x y' R2 Fw2 M'
[R, U F]
R : U F

[X,Y] = X Y X' Y'
X:Y = X Y X'
X와 Y에는 여러 회전을 넣을 수 있습니다.

// 뒤의 내용은 라인 주석으로 처리되어 그대로 출력됩니다.
예: R U R' U' // 트위스트`;
}

function getOutputDisplay(type) {
  if (state.selectedPuzzle === "square1") {
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

  const rawValue = state.outputs?.[type] ?? "";
  const value =
    typeof rawValue === "object" && rawValue !== null
      ? rawValue[state.outputFormat] ?? ""
      : rawValue;

  return {
    value,
    message: value || "공식을 입력하세요",
    isError: false,
  };
}

function getOutputTitle(type) {
  if (type !== "viewpoint" && type !== "viewpointInverse") {
    return outputTypes[type];
  }

  const { xFace, yFace } = state.viewpoint;
  const suffix = type === "viewpointInverse" ? "의 역공식" : "";
  return `{${xFace},${yFace}} 윗면 시점${suffix} (${xFace} ${faceColors[xFace].name}, ${yFace} ${faceColors[yFace].name})`;
}

function renderOutputs() {
  if (state.selectedPuzzle === "3x3") {
    return render3x3Outputs();
  }

  return `
    ${state.visibleOutputCards
    .map((card) => renderOutputCard(card))
    .join("")}
  `;
}

function render3x3Outputs() {
  return `
    <div class="output-columns" aria-label="3x3 변환 출력">
      <div class="output-column">
        ${state.visibleOutputCards
    .map((card) => renderSingleOutputCard(card.title, card.type, "formula"))
    .join("")}
      </div>
      <div class="output-column output-column--inverse">
        ${state.visibleOutputCards
    .map((card) => renderSingleOutputCard(`${card.title}의 역공식`, card.inverseType, "inverse"))
    .join("")}
      </div>
    </div>
  `;
}

function renderSettingsModal() {
  if (!state.isSettingsOpen) {
    return "";
  }

  return `
    <div class="settings-backdrop" data-settings-close>
      <section
        class="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        data-settings-dialog
      >
        <div class="settings-dialog__header">
          <h2 id="settings-title">설정</h2>
          <button class="settings-dialog__close" type="button" data-settings-close aria-label="설정 닫기">
            닫기
          </button>
        </div>
        <fieldset class="settings-group">
          <legend>커뮤테이터 표현방식</legend>
          <label class="settings-option">
            <input
              type="radio"
              name="outputFormat"
              value="compact"
              ${state.outputFormat === "compact" ? "checked" : ""}
            />
            <span>축약</span>
          </label>
          <label class="settings-option">
            <input
              type="radio"
              name="outputFormat"
              value="expanded"
              ${state.outputFormat === "expanded" ? "checked" : ""}
            />
            <span>풀어쓰기</span>
          </label>
        </fieldset>
        <fieldset class="settings-group">
          <legend>와이드 회전 표현방식</legend>
          <label class="settings-option">
            <input
              type="radio"
              name="wideMoveStyle"
              value="wide"
              ${state.wideMoveStyle === "wide" ? "checked" : ""}
            />
            <span>와이드 회전</span>
          </label>
          <label class="settings-option">
            <input
              type="radio"
              name="wideMoveStyle"
              value="lowercase"
              ${state.wideMoveStyle === "lowercase" ? "checked" : ""}
            />
            <span>소문자 회전</span>
          </label>
        </fieldset>
      </section>
    </div>
  `;
}

function renderSingleOutputCard(title, type, variant = "formula") {
  return `
    <section class="output-card output-card--${variant}" aria-labelledby="${type}-title">
      <div class="output-card__header">
        <h2 id="${type}-title">${escapeHtml(title)}</h2>
      </div>
      ${renderOutputValue(type, variant)}
    </section>
  `;
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

function renderOutputValue(type, variant = "formula") {
  const output = getOutputDisplay(type);
  const title = getOutputTitle(type);

  return `
    <div class="output-item output-item--${variant}">
      <div class="output-item__header">
        <h3>${escapeHtml(title)}</h3>
        <button
          class="copy-button"
          type="button"
          data-copy="${type}"
          ${output.value ? "" : "disabled"}
          aria-label="${escapeHtml(title)} 복사"
          title="${escapeHtml(title)} 복사"
        >
          복사
        </button>
      </div>
      <output class="output-value output-value--${variant} ${output.isError ? "output-value--error" : ""}" for="algorithm-input">${escapeHtml(output.message)}</output>
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
                  ${escapeHtml(getInputHelpText())}
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

          <div class="action-row">
            <button class="transform-button" type="button" data-transform>
              변환하기
            </button>
            <button class="settings-button" type="button" data-settings-open>
              설정
            </button>
          </div>
          ${renderViewpointControl()}
        </section>

        <section class="output-panel" aria-label="출력">
          ${renderOutputs()}
        </section>
      </section>
      ${renderSettingsModal()}
    </section>
  `;
}

function copyOutput(type) {
  const rawValue = state.outputs?.[type];
  const value =
    typeof rawValue === "object" && rawValue !== null
      ? rawValue[state.outputFormat]
      : rawValue;

  if (!value) {
    return;
  }

  navigator.clipboard?.writeText(value);
}

function updateOutputsFromCurrentInput() {
  state.outputs = null;
  state.errorMessage = "";

  if (!state.inputAlgorithm.trim()) {
    return;
  }

  try {
    state.outputs = transformAlgorithm(state.selectedPuzzle, state.inputAlgorithm, {
      viewpoint: state.viewpoint,
      wideMoveStyle: state.wideMoveStyle,
    });
  } catch (error) {
    state.errorMessage = error.message || "잘못된 입력입니다.";
  }
}

app.addEventListener("change", (event) => {
  if (event.target.name === "puzzle") {
    state.selectedPuzzle = event.target.value;
    state.outputs = null;
    state.errorMessage = "";
    render();
    return;
  }

  if (event.target.name === "viewpointX") {
    state.viewpoint.xFace = event.target.value;
    normalizeViewpointSelection();
    state.outputs = null;
    state.errorMessage = "";
    render();
    return;
  }

  if (event.target.name === "viewpointY") {
    state.viewpoint.yFace = event.target.value;
    state.outputs = null;
    state.errorMessage = "";
    render();
    return;
  }

  if (event.target.name === "outputFormat") {
    state.outputFormat = event.target.value;
    document.querySelector(".output-panel").innerHTML = renderOutputs();
    return;
  }

  if (event.target.name === "wideMoveStyle") {
    state.wideMoveStyle = event.target.value;
    updateOutputsFromCurrentInput();
    render();
  }
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
  const settingsOpenButton = event.target.closest("[data-settings-open]");
  if (settingsOpenButton) {
    state.isSettingsOpen = true;
    render();
    return;
  }

  const settingsCloseTarget = event.target.closest("[data-settings-close]");
  if (settingsCloseTarget && !event.target.closest("[data-settings-dialog]")) {
    state.isSettingsOpen = false;
    render();
    return;
  }

  if (event.target.closest(".settings-dialog__close")) {
    state.isSettingsOpen = false;
    render();
    return;
  }

  const transformButton = event.target.closest("[data-transform]");
  if (transformButton) {
    updateOutputsFromCurrentInput();
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
