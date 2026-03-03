export { defineWebComponent } from "./define-web-component";

import { defineWebComponent } from "./define-web-component";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Input } from "../ui/input";

export function registerFabrkButton(): void {
  defineWebComponent("fabrk-button", Button, ["variant", "size", "class-name"]);
}

export function registerFabrkBadge(): void {
  defineWebComponent("fabrk-badge", Badge, ["variant", "class-name"]);
}

export function registerFabrkCard(): void {
  defineWebComponent("fabrk-card", Card, ["class-name"]);
}

export function registerFabrkInput(): void {
  defineWebComponent("fabrk-input", Input, ["type", "placeholder", "value", "class-name"]);
}

export function registerAllFabrkComponents(): void {
  registerFabrkButton();
  registerFabrkBadge();
  registerFabrkCard();
  registerFabrkInput();
}
