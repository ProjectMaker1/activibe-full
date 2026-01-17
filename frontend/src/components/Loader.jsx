import React, { useMemo } from "react";
import "./loader.css";

export default function Loader() {
  // Loader რომ mount-დება, nonce უცვლელია ამ mount-ის განმავლობაში,
  // მაგრამ შემდეგ გამოჩენაზე სხვა გახდება => svg თავიდან ჩაიტვირთება
  const nonce = useMemo(() => Date.now().toString(), []);

  return (
    <div className="loader-overlay">
      <div className="loader-center">
        <img
          key={nonce}
          className="loader-logo"
          src={`/actilogo.svg?v=${nonce}`}
          alt="ActiVibe loading"
        />
      </div>
    </div>
  );
}
