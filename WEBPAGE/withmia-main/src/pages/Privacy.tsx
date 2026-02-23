import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SecurityTrust } from "@/components/SecurityTrust";
import { useEffect } from "react";

const Privacy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20">
        <SecurityTrust />
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
