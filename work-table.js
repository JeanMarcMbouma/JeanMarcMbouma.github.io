const table = document.querySelector(".work-table");
const projectDialog = document.querySelector(".project-dialog");

if (table && typeof projectDialog?.showModal === "function") {
  setupWorkTable(table, projectDialog);
}

function setupWorkTable(table, dialog) {
  const cards = table.querySelector(".work-cards");
  const projects = [...cards.querySelectorAll(".work-card")];
  const deckPocket = table.querySelector(".deck-pocket");
  const deckButton = deckPocket.querySelector(".deck-button");
  const stack = deckButton.querySelector(".deck-stack");
  const count = deckButton.querySelector("#deck-count");
  const toolbar = table.querySelector(".table-toolbar");
  const viewButton = toolbar.querySelector(".table-view");
  const status = table.querySelector(".table-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canAnimate = typeof Element.prototype.animate === "function";
  const dialogCategory = dialog.querySelector(".label");
  const dialogTitle = dialog.querySelector("h3");
  const dialogDescription = dialog.querySelector(".work-description");
  const dialogLink = dialog.querySelector(".dialog-link");

  const handSize = 3;
  let hand = projects.slice(0, handSize);
  let inDeck = projects.slice(handSize);
  let allProjects = false;
  let shuffling = false;

  for (const project of projects) {
    const summary = project.querySelector(".work-summary");
    const category = summary.querySelector(".label").textContent;
    const title = summary.querySelector("h3").textContent;
    const description = summary.querySelector(".work-description").textContent;
    const link = summary.querySelector("a");

    const front = document.createElement("button");
    front.className = "card-front";
    front.type = "button";
    front.setAttribute("aria-haspopup", "dialog");
    front.innerHTML = '<span class="card-motif" aria-hidden="true"></span>'
      + '<span class="card-copy"><span class="label"></span><span class="card-title"></span><span class="card-teaser"></span></span>'
      + '<span class="card-open" aria-hidden="true"><span class="arrow"></span></span>';
    front.querySelector(".label").textContent = category;
    front.querySelector(".card-title").textContent = title;
    front.querySelector(".card-teaser").textContent = project.dataset.teaser;
    front.addEventListener("click", () => {
      if (shuffling) return;
      dialog.dataset.project = project.dataset.project;
      dialogCategory.textContent = category;
      dialogTitle.textContent = title;
      dialogDescription.textContent = description;
      dialogLink.replaceChildren(...(link ? [link.cloneNode(true)] : []));
      dialog.showModal();

      if (canAnimate && !reducedMotion.matches) {
        const from = midpoint(front);
        const to = midpoint(dialog);
        const dx = (from.x - to.x) * .23;
        const dy = (from.y - to.y) * .23;
        dialog.animate([
          { transform: `perspective(850px) translate(${dx}px, ${dy}px) rotateX(-11deg) rotateY(-24deg) scale(.83)`, opacity: 0 },
          { transform: "perspective(850px) translate(0, -5px) rotateX(2deg) rotateY(4deg) scale(1.015)", opacity: 1, offset: .72 },
          { transform: "none", opacity: 1 },
        ], { duration: 380, easing: "cubic-bezier(.19,.75,.22,1)" });
      }
    });
    project.append(front);
    summary.hidden = true;
  }

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  function showCards(visible) {
    for (const project of projects) project.hidden = !visible.includes(project);
    for (const project of visible) cards.append(project);
  }

  function renderTable() {
    table.dataset.view = allProjects ? "all" : "deck";
    viewButton.textContent = allProjects ? "Back to the deck" : `View all ${projects.length} projects`;
    viewButton.setAttribute("aria-expanded", String(allProjects));
    deckPocket.hidden = allProjects;
    showCards(allProjects ? projects : hand);
    count.textContent = `${hand.length} of ${projects.length} shown`;
  }

  viewButton.addEventListener("click", () => {
    if (shuffling) return;
    allProjects = !allProjects;
    renderTable();
    status.textContent = allProjects ? "All projects are visible." : "Deck view restored.";
  });

  deckButton.addEventListener("click", async () => {
    if (shuffling) return;
    shuffling = true;
    deckButton.setAttribute("aria-disabled", "true");
    viewButton.setAttribute("aria-disabled", "true");

    try {
      const nextHand = shuffled(inDeck.slice(0, handSize));
      const previousHand = hand;
      if (canAnimate && !reducedMotion.matches) {
        await animateCards(previousHand, stack, false);
      }

      if (cards.contains(document.activeElement)) deckButton.focus({ preventScroll: true });
      hand = nextHand;
      inDeck = [...inDeck.slice(handSize), ...previousHand];
      renderTable();

      if (canAnimate && !reducedMotion.matches) {
        stack.animate([
          { transform: "rotate(-5deg) scale(.94)" },
          { transform: "translateY(-7px) rotate(8deg) scale(1.08)", offset: .33 },
          { transform: "rotate(-3deg)" },
          { transform: "none" },
        ], { duration: 460, easing: "ease-out" });
        await animateCards(hand, stack, true);
      }

      const titles = hand.map((project) => project.querySelector(".card-title").textContent);
      status.textContent = `Dealt ${titles.join(", ")}.`;
    } finally {
      shuffling = false;
      deckButton.removeAttribute("aria-disabled");
      viewButton.removeAttribute("aria-disabled");
    }
  });

  toolbar.hidden = false;
  renderTable();
}

function shuffled(items) {
  const order = [...items];
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

function midpoint(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function animateCards(projects, stack, dealing) {
  const deck = midpoint(stack);
  const animations = projects.map((project, index) => {
    const position = midpoint(project);
    const dx = deck.x - position.x;
    const dy = deck.y - position.y;
    const tilt = index % 2 === 0 ? -1 : 1;
    const travel = (amount, lift, roll, flip, scale) =>
      `perspective(850px) translate(${dx * amount}px, ${dy * amount - lift}px) rotateZ(${roll * tilt}deg) rotateY(${flip * tilt}deg) scale(${scale})`;

    const stacked = { transform: travel(1, 0, 22, 75, .31), opacity: 0 };
    const settled = { transform: "none", opacity: 1 };
    const keyframes = dealing ? [
      stacked,
      { transform: travel(.67, 32, 13, 45, .66), opacity: .85, offset: .33 },
      { transform: travel(.06, 13, -5, -9, 1.035), opacity: 1, offset: .78 },
      settled,
    ] : [
      settled,
      { transform: travel(.16, 23, -8, -12, 1.025), opacity: 1, offset: .36 },
      stacked,
    ];

    return project.animate(keyframes, {
      duration: dealing ? 510 : 340,
      delay: index * (dealing ? 92 : 66),
      easing: dealing ? "cubic-bezier(.17,.7,.24,1)" : "cubic-bezier(.48,.09,.52,1)",
      fill: "both",
    });
  });

  return Promise.allSettled(animations.map((animation) => animation.finished))
    .then(() => {
      for (const animation of animations) animation.cancel();
    });
}
