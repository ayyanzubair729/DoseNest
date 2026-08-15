import { Link } from "react-router-dom";
import { birdPhone } from "../../utils/assets.js";

export default function BrandMark({ className = "" }) {
  return (
    <Link to="/" className={`brand ${className}`} aria-label="DoseNest — home">
      <img src={birdPhone} alt="" className="brand__mark" />
      <span className="brand__name">
        Dose<span className="brand__accent">Nest</span>
      </span>
    </Link>
  );
}