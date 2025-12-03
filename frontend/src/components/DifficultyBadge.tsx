import { Difficulty } from "../types";

const colorMap: Record<Difficulty, string> = {
  EASY: "bg-easy/10 text-easy border-easy/30",
  MEDIUM: "bg-medium/10 text-medium border-medium/30",
  HARD: "bg-hard/10 text-hard border-hard/30"
};

interface Props {
  level: Difficulty;
}

const DifficultyBadge = ({ level }: Props) => {
  return <span className={`px-2 py-1 rounded-full text-xs border ${colorMap[level]}`}>{level}</span>;
};

export default DifficultyBadge;
