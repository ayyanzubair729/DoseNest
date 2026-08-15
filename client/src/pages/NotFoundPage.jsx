import { Link } from "react-router-dom";
import PageWrapper from "../components/common/PageWrapper";
import { birdMain } from "../utils/assets.js";

export default function NotFoundPage() {
  return (
    <PageWrapper>
      <section className="container not-found">
        <img src={birdMain} alt="Nesty, the DoseNest mascot" className="not-found__bird" />
        <h1>Page not found</h1>
        <p>The page you are looking for has flown away.</p>
        <Link to="/" className="btn btn--primary">
          Back to home
        </Link>
      </section>
    </PageWrapper>
  );
}