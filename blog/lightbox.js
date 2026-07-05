document.addEventListener("DOMContentLoaded", function () {
  var overlay = document.createElement("div");
  overlay.id = "lightboxOverlay";
  overlay.innerHTML = "<div class=\"lightbox-frame\"><img class=\"lightbox-img\" alt=\"\" /><button class=\"lightbox-close\" type=\"button\" aria-label=\"Zamknij podgląd\"></button></div>";
  document.body.appendChild(overlay);

  var lightboxImage = overlay.querySelector(".lightbox-img");
  var closeButton = overlay.querySelector(".lightbox-close");

  function openLightbox(img) {
    lightboxImage.src = img.currentSrc || img.src;
    lightboxImage.alt = img.alt || "Podgląd obrazu";
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () {
      lightboxImage.src = "";
    }, 250);
  }

  document.body.addEventListener("click", function (event) {
    var image = event.target.closest(".article-body img");
    if (image) {
      event.preventDefault();
      openLightbox(image);
      return;
    }

    if (event.target === overlay || event.target === closeButton) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) {
      closeLightbox();
    }
  });
});
