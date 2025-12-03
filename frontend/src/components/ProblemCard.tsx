import { Link } from "react-router-dom";
import { Problem } from "../types";
import DifficultyBadge from "./DifficultyBadge";

const ProblemCard = ({ problem }: { problem: Problem }) => {
  return (
    <Link to={`/problems/${problem.id}`} className="block card p-4 hover:-translate-y-1 hover:shadow-md transition">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{problem.slug}</p>
          <h3 className="text-lg font-semibold text-slate-800">{problem.title}</h3>
        </div>
        <DifficultyBadge level={problem.difficulty} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        {problem.tags.map((tag) => (
          <span key={tag} className="px-2 py-1 rounded-full bg-slate-100">
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-500">更新: {new Date(problem.updated_at).toLocaleString()}</p>
    </Link>
  );
};

export default ProblemCard;
