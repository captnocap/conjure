import type { QuestionSet } from '../kit/contract';
import { choice } from '../kit/questions';

/**
 * A loop must visibly move even when nothing on stage does: a breathing figure redrawn by a heavy
 * look changes a few dozen pixels. So the camera moves along a closed path, and the finishing passes
 * animate with the same phase, so the last frame of a loop meets its first.
 */
export const CAMERA_MOVES = {
  drift: 'A slow sideways drift round the scene and back, so near and far slide past each other.',
  push: 'A slow push in toward the hero and back out, like a held breath.',
  float: 'A dreamlike float on a small circle, as if the viewer were weightless.',
  still: 'The camera holds still; only the picture itself moves.',
} as const;
export type CameraMove = keyof typeof CAMERA_MOVES;

export const MOTION_QUESTIONS = {
  loopCamera: choice('If the print moves, how does the camera move?', CAMERA_MOVES),
} satisfies QuestionSet;
export const MOTION_NAMES: readonly string[] = Object.keys(MOTION_QUESTIONS);

export const cameraMoveOf = (answers: Record<string, string | number | boolean>): CameraMove =>
  typeof answers.loopCamera === 'string' && Object.hasOwn(CAMERA_MOVES, answers.loopCamera) ? answers.loopCamera as CameraMove : 'drift';

/** How the camera is offset at one point of a loop: turns in radians about the hero, and a zoom. */
export interface CameraOffset { yaw: number; pitch: number; push: number }

/** The camera offset at `phase` (0–1) of a loop. Every move starts and ends at the printed view. */
export function cameraAt(move: CameraMove, phase: number): CameraOffset {
  const turn = Math.PI * 2 * phase, degree = Math.PI / 180;
  switch (move) {
    case 'drift': return { yaw: 7 * degree * Math.sin(turn), pitch: 0, push: 0 };
    case 'push': return { yaw: 0, pitch: 0, push: 0.14 * (1 - Math.cos(turn)) / 2 };
    case 'float': return { yaw: 4 * degree * Math.sin(turn), pitch: 2.5 * degree * (1 - Math.cos(turn)) / 2, push: 0.03 * Math.sin(turn) };
    default: return { yaw: 0, pitch: 0, push: 0 };
  }
}
