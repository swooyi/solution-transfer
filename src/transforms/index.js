import { transform3x3Algorithm } from "./3x3.js";
import { transformFtoAlgorithm } from "./fto.js";

export function transformAlgorithm(puzzle, algorithm) {
  if (puzzle === "3x3") {
    return transform3x3Algorithm(algorithm);
  }

  if (puzzle === "fto") {
    return transformFtoAlgorithm(algorithm);
  }

  return {
    inverse: "",
    mirrorLeftRight: "",
    mirrorLeftRightInverse: "",
    mirrorFrontBack: "",
    mirrorFrontBackInverse: "",
    mirrorUpDown: "",
    mirrorUpDownInverse: "",
  };
}
