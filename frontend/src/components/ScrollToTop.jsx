import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    // 1) ზოგჯერ ბრაუზერი თვითონ "აბრუნებს" scroll-ს history-დან
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const scrollNow = () => {
      // A) ყველაზე კლასიკური: window / document
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // B) თუ სკროლი კონტეინერზე გაქვს (desktop-ზე ხშირად ეს ხდება)
      const main = document.querySelector(".app-main");
      if (main) main.scrollTop = 0;

      const root = document.querySelector(".app-root");
      if (root) root.scrollTop = 0;
    };

    // 2) ზოგჯერ route იცვლება, მაგრამ DOM ჯერ ბოლომდე არ არის დარენდერებული
    // ამიტომ ვაკეთებთ რამდენიმე ტაქტს: sync + raf + timeout
    scrollNow();
    requestAnimationFrame(scrollNow);
    setTimeout(scrollNow, 0);
    setTimeout(scrollNow, 50);
  }, [pathname]);

  return null;
}