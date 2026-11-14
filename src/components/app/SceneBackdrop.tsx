// A scene from the manifest (./scenes.ts), filling the window behind a page.
//
// In the app shell it is `pinned`: a zero-height sticky anchor at the top of the content column whose
// picture hangs one window tall below it, so the scene stays put while the page scrolls over it and
// never reaches under the sidebar. On a full-screen page (sign-in, onboarding) it simply fills its
// `relative isolate` parent. Either way it sits behind the content (-z-10) and takes no clicks.
//
// Over the picture: the title haze (or one even tint on a reading page), then nothing. The haze only
// covers the top of the window, where a page title sits; lower down the picture is clear and every
// piece of text is on glass. Changing scene cross-fades. Decorative: hidden from assistive tech.
import { AnimatePresence, motion } from "framer-motion";
import { scrimGradient } from "../landing/plates";
import { QUIET_TINT, SCENES, TITLE_HAZE, type SceneId } from "./scenes";

/** The haze holds for the height of the tallest page title (Ambassador's, at 1024px), then clears: the alpha is what the mask reads, so any opaque token does. */
export const HAZE_MASK = "linear-gradient(180deg, var(--fg) 0, var(--fg) 26rem, transparent 34rem)";

/**
 * `lazy` is for a scene below the fold (the landing page's closing sunset): the browser fetches it as the visitor
 * nears it. Every other scene is the first thing a page paints, so it is fetched at high priority.
 */
export function SceneBackdrop({ scene, quiet = false, pinned = false, haze = true, lazy = false }: { scene: SceneId; quiet?: boolean; pinned?: boolean; haze?: boolean; lazy?: boolean }) {
  const art = SCENES[scene];
  const layers = (
    <>
      <AnimatePresence initial={false}>
        <motion.img
          key={scene}
          src={art.src}
          width={art.w}
          height={art.h}
          alt=""
          decoding="async"
          loading={lazy ? "lazy" : "eager"}
          fetchPriority={lazy ? "low" : "high"}
          draggable={false}
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: art.position }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </AnimatePresence>
      {quiet ? (
        <div data-scene-tint={QUIET_TINT} className="absolute inset-0" style={{ backgroundImage: scrimGradient({ kind: "all", alpha: QUIET_TINT }) ?? undefined }} />
      ) : (
        haze && <div data-scene-haze={TITLE_HAZE.alpha} className="absolute inset-0" style={{ backgroundImage: scrimGradient(TITLE_HAZE) ?? undefined, maskImage: HAZE_MASK, WebkitMaskImage: HAZE_MASK }} />
      )}
    </>
  );
  if (pinned) {
    return (
      <div aria-hidden data-scene={scene} className="pointer-events-none sticky top-0 -z-10 h-0 print:hidden">
        <div className="absolute inset-x-0 top-0 h-dvh overflow-hidden">{layers}</div>
      </div>
    );
  }
  return (
    <div aria-hidden data-scene={scene} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden print:hidden">
      {layers}
    </div>
  );
}
