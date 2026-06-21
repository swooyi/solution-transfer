import { transform3x3Algorithm } from "./3x3.js";

export function transformAlgorithm(puzzle, algorithm) {
  if (puzzle !== "3x3") {
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

  return transform3x3Algorithm(algorithm);
}
