/* Miesmuschel View (Planungs.md 5.8) - minimal single-purpose screen.
   History opens in a Drawer (reuses the Sheet component). Sound reuses
   v1's pure Web Audio helper (Planungs.md 3). */

import { askMuschel, pushHistory } from "../core/muschel-engine.js";
import { loadV2State, saveV2State } from "../core/storage.js";
import { playmuschelDecisionSound } from "../../../../assets/js/randomizer/sound.js";
import { openSheet } from "../components/sheet.js";

export function render(outlet) {
  let history = loadV2State().muschelHistory ?? [];

  const wrap = document.createElement("div");
  wrap.className = "muschel-wrap";

  const questionLabel = document.createElement("label");
  questionLabel.className = "squad-field-label muschel-question-label";
  questionLabel.textContent = "Deine Frage";
  const questionInput = document.createElement("textarea");
  questionInput.rows = 3;
  questionInput.className = "squad-text-input muschel-question-input";
  questionInput.placeholder = "Darf ich dieses Gear spielen?";
  questionLabel.appendChild(questionInput);

  const shell = document.createElement("div");
  shell.className = "muschel-shell-visual";
  shell.setAttribute("aria-hidden", "true");
  shell.textContent = "🐚";

  const resultCard = document.createElement("div");
  resultCard.className = "muschel-result-card";
  resultCard.hidden = true;
  resultCard.setAttribute("role", "status");
  resultCard.setAttribute("aria-live", "polite");

  const actionsRow = document.createElement("div");
  actionsRow.className = "loadout-actions muschel-actions-row";

  const askBtn = document.createElement("button");
  askBtn.type = "button";
  askBtn.className = "btn btn--primary btn--lg";
  askBtn.textContent = "Miesmuschel befragen";

  const historyBtn = document.createElement("button");
  historyBtn.type = "button";
  historyBtn.className = "btn btn--secondary";
  historyBtn.textContent = `Verlauf (${history.length})`;

  actionsRow.append(askBtn, historyBtn);

  wrap.append(questionLabel, shell, resultCard, actionsRow);
  outlet.appendChild(wrap);

  function ask() {
    const entry = askMuschel(questionInput.value);
    history = pushHistory(history, entry);
    saveV2State({ muschelHistory: history });
    historyBtn.textContent = `Verlauf (${history.length})`;

    resultCard.hidden = false;
    resultCard.classList.toggle("allow", entry.allowed);
    resultCard.classList.toggle("deny", !entry.allowed);
    resultCard.replaceChildren();
    const resultTitle = document.createElement("p");
    resultTitle.className = "muschel-result-title";
    resultTitle.textContent = `Die Miesmuschel sagt: ${entry.allowed ? "JA" : "NEIN"}`;
    const resultLine = document.createElement("p");
    resultLine.className = "muschel-result-line";
    resultLine.textContent = entry.question;
    resultCard.append(resultTitle, resultLine);

    shell.classList.remove("is-deciding");
    // Force reflow so the animation class can be re-triggered on repeat asks.
    void shell.offsetWidth;
    shell.classList.add("is-deciding");

    playmuschelDecisionSound(entry.allowed);
  }

  askBtn.addEventListener("click", ask);
  questionInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      ask();
    }
  });

  historyBtn.addEventListener("click", () => {
    openSheet({
      title: "Verlauf",
      buildBody(body) {
        if (history.length === 0) {
          const empty = document.createElement("p");
          empty.className = "wheel-side-hint";
          empty.textContent = "Noch keine Entscheidung.";
          body.appendChild(empty);
          return;
        }
        const list = document.createElement("ul");
        list.className = "muschel-history-list";
        history.forEach((entry) => {
          const li = document.createElement("li");
          li.className = `muschel-history-item ${entry.allowed ? "allow" : "deny"}`;
          const question = document.createElement("span");
          question.textContent = entry.question;
          const answer = document.createElement("strong");
          answer.textContent = entry.allowed ? "JA" : "NEIN";
          li.append(question, answer);
          list.appendChild(li);
        });
        body.appendChild(list);
      },
      buildFooter(footer, controller) {
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = "btn btn--ghost";
        clearBtn.textContent = "Verlauf löschen";
        clearBtn.addEventListener("click", () => {
          history = [];
          saveV2State({ muschelHistory: history });
          historyBtn.textContent = "Verlauf (0)";
          controller.close();
        });
        footer.appendChild(clearBtn);
      },
    });
  });

  return null;
}
