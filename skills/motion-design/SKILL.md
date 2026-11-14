---
name: motion-design
description: Animation, micro-interactions, snappy UI transitions (150ms-350ms), easing curves (cubic-bezier ease-out), anticipation, hitstop, and tactile feedback.
---

# Motion & Interaction Design Skill

Crafting responsive, tactile, and delightful user interfaces and animations.

## Core Rules

1. **Snappy Timings**: Keep UI tweens fast (150ms–350ms). Users should never wait for an animation to complete before they can interact.
2. **Never Linear**: Never use linear easing for natural movements or interface transitions. Always use smooth ease-out (e.g. `cubic-bezier(0.16, 1, 0.3, 1)`) for entering elements or ease-in-out for looping states.
3. **Anticipation & Follow-Through**: Important actions should provide clear feedback—subtle scale down on press (0.96-0.98), spring bounce on release, or micro-hitstop for high-impact events.
4. **Hierarchy & Staggering**: When revealing lists or grids, stagger items by 30ms–50ms to create visual flow without delaying perception.
5. **Reduced Motion Accessibility**: Always respect `prefers-reduced-motion` media queries or configuration settings by falling back to instant opacity fades.
