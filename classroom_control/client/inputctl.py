"""Inyección de eventos de ratón y teclado para el control remoto.

El administrador envía coordenadas NORMALIZADAS (0.0-1.0) para que el mapeo
funcione sea cual sea la resolución del cliente. Aquí se traducen al tamaño
real de la pantalla y se reproducen con ``pyautogui``.
"""

from __future__ import annotations

from typing import Any, Dict, Tuple

import pyautogui

# Desactivamos el "failsafe" (abortar al llevar el ratón a una esquina) porque
# en control remoto el movimiento lo dirige el profesor, no un accidente local.
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.0

# Traducción de keysyms de Tkinter (los que manda la consola) a nombres de
# tecla que entiende pyautogui. Lo no listado se pasa tal cual en minúsculas.
_KEYMAP = {
    "Return": "enter",
    "Escape": "esc",
    "BackSpace": "backspace",
    "Tab": "tab",
    "space": "space",
    "Delete": "delete",
    "Up": "up",
    "Down": "down",
    "Left": "left",
    "Right": "right",
    "Home": "home",
    "End": "end",
    "Prior": "pageup",
    "Next": "pagedown",
    "Control_L": "ctrl",
    "Control_R": "ctrl",
    "Alt_L": "alt",
    "Alt_R": "alt",
    "Shift_L": "shift",
    "Shift_R": "shift",
    "Win_L": "win",
    "Win_R": "win",
    "Caps_Lock": "capslock",
}
for _i in range(1, 13):
    _KEYMAP[f"F{_i}"] = f"f{_i}"


def _map_key(keysym: str) -> str:
    if keysym in _KEYMAP:
        return _KEYMAP[keysym]
    return keysym.lower() if len(keysym) == 1 else keysym


class InputInjector:
    def __init__(self, screen_size: Tuple[int, int]) -> None:
        self._w, self._h = screen_size

    def _abs(self, x: float, y: float) -> Tuple[int, int]:
        px = int(max(0.0, min(1.0, x)) * (self._w - 1))
        py = int(max(0.0, min(1.0, y)) * (self._h - 1))
        return px, py

    def apply(self, ev: Dict[str, Any]) -> None:
        """Reproduce un evento de entrada recibido del administrador."""
        kind = ev.get("ev")
        try:
            if kind == "move":
                px, py = self._abs(ev["x"], ev["y"])
                pyautogui.moveTo(px, py)
            elif kind == "down":
                px, py = self._abs(ev["x"], ev["y"])
                pyautogui.mouseDown(px, py, button=ev.get("button", "left"))
            elif kind == "up":
                px, py = self._abs(ev["x"], ev["y"])
                pyautogui.mouseUp(px, py, button=ev.get("button", "left"))
            elif kind == "scroll":
                pyautogui.scroll(int(ev.get("amount", 0)))
            elif kind == "key":
                key = _map_key(ev.get("key", ""))
                if not key:
                    return
                if ev.get("down", True):
                    pyautogui.keyDown(key)
                else:
                    pyautogui.keyUp(key)
        except Exception:
            # Un evento inválido no debe tumbar el agente.
            pass
