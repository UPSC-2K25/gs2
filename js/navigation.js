
/*
 * Shared site navigation
 * Data source: data/navigation.json
 *
 * Generates:
 * - Site header and primary navigation
 * - Module dropdown
 * - Module chapter sidebar
 * - Breadcrumbs
 * - Chapter previous/next navigation
 * - Site search
 * - Site footer
 *
 * The script derives the site root from its own URL, so it works
 * both at the domain root and under a GitHub Pages project path.
 */

(() => {
  "use strict";

  const SCRIPT_PATH = "js/navigation.js";
  const CONFIG_PATH = "data/navigation.json";

  const scriptElement =
    document.currentScript ||
    document.querySelector(`script[src*="${SCRIPT_PATH}"]`);

  if (!scriptElement || !scriptElement.src) {
    console.error("Navigation: unable to determine the site root.");
    return;
  }

  const scriptUrl = new URL(scriptElement.src, window.location.href);
  const siteRoot = new URL(
    scriptUrl.pathname.replace(/js\/navigation\.js$/, ""),
    scriptUrl.origin
  );

  const configUrl = new URL(CONFIG_PATH, siteRoot);

  const normalizePath = (path) =>
    decodeURIComponent(path)
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/")
      .replace(/\/$/, "") || "/";

  const currentPath = normalizePath(window.location.pathname);

  const resolveSitePath = (path) =>
    new URL(path, siteRoot).href;

  const isCurrentPath = (path) =>
    normalizePath(new URL(path, siteRoot).pathname) === currentPath;

  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined) {
      element.textContent = text;
    }

    return element;
  };

  const createLink = (label, path, className = "") => {
    const link = createElement("a", className, label);
    link.href = resolveSitePath(path);

    if (isCurrentPath(path)) {
      link.setAttribute("aria-current", "page");
    }

    return link;
  };

  const getPageContext = (config) => {
    for (const section of config.sections || []) {
      if (isCurrentPath(section.path)) {
        return {
          section,
          chapter: null
        };
      }

      const chapter = (section.chapters || []).find((item) =>
        isCurrentPath(item.path)
      );

      if (chapter) {
        return {
          section,
          chapter
        };
      }
    }

    return {
      section: null,
      chapter: null
    };
  };

  const getOrCreate = (selector, tag, className, parent) => {
    let element = document.querySelector(selector);

    if (!element) {
      element = createElement(tag, className);
      parent.appendChild(element);
    }

    return element;
  };

  const renderHeader = (config) => {
    const site = config.site || {};
    const interfaceConfig = config.interface || {};

    const header = getOrCreate(
      "[data-site-header]",
      "header",
      "site-header",
      document.body
    );

    header.replaceChildren();

    const headerInner = createElement("div", "site-header-inner");

    const brand = createElement("a", "site-brand");
    brand.href = resolveSitePath(site.home || "index.html");

    const mark = createElement(
      "span",
      "site-brand-mark",
      site.brandMark || ""
    );

    const brandText = createElement("span", "site-brand-text");

    brandText.append(
      createElement("span", "site-name", site.name || ""),
      createElement("span", "site-subtitle", site.subtitle || "")
    );

    brand.append(mark, brandText);

    const primaryNav = createElement(
      "nav",
      "primary-navigation"
    );

    primaryNav.setAttribute("aria-label", "Primary navigation");

    primaryNav.appendChild(
      createLink(site.homeLabel || "Home", site.home || "index.html")
    );

    if (interfaceConfig.primaryNavigation === "module-dropdown") {
      const dropdown = createElement("details", "module-dropdown");
      const summary = createElement("summary", "", "Modules");
      const moduleList = createElement("div", "module-dropdown-list");

      summary.setAttribute("aria-label", "Browse all modules");

      (config.sections || []).forEach((section) => {
        const item = createLink(
          section.label,
          section.path,
          "module-dropdown-link"
        );

        if (interfaceConfig.showModuleNumbers && section.number) {
          const number = createElement(
            "span",
            "module-number",
            section.number
          );
          item.prepend(number);
        }

        if (
          interfaceConfig.showChapterCounts &&
          Array.isArray(section.chapters)
        ) {
          item.appendChild(
            createElement(
              "span",
              "module-count",
              String(section.chapters.length)
            )
          );
        }

        moduleList.appendChild(item);
      });

      dropdown.append(summary, moduleList);
      primaryNav.appendChild(dropdown);
    }

    headerInner.append(brand, primaryNav);

    if (interfaceConfig.showSearch) {
      headerInner.appendChild(renderSearch(config));
    }

    header.appendChild(headerInner);
  };

  const renderSearch = (config) => {
    const wrapper = createElement("div", "site-search");

    const input = createElement("input", "site-search-input");
    input.type = "search";
    input.placeholder = "Search modules and chapters";
    input.setAttribute("aria-label", "Search modules and chapters");
    input.autocomplete = "off";

    const results = createElement("div", "site-search-results");
    results.hidden = true;
    results.setAttribute("role", "list");

    const searchableItems = [];

    (config.sections || []).forEach((section) => {
      searchableItems.push({
        label: section.label,
        path: section.path,
        type: "Module"
      });

      (section.chapters || []).forEach((chapter) => {
        searchableItems.push({
          label: chapter.label,
          path: chapter.path,
          type: section.label
        });
      });
    });

    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      results.replaceChildren();

      if (!query) {
        results.hidden = true;
        return;
      }

      const matches = searchableItems
        .filter((item) => item.label.toLowerCase().includes(query))
        .slice(0, 12);

      if (matches.length === 0) {
        results.appendChild(
          createElement("p", "search-no-results", "No matching pages found.")
        );
      } else {
        matches.forEach((item) => {
          const link = createLink(item.label, item.path, "search-result");
          link.appendChild(
            createElement("span", "search-result-type", item.type)
          );
          results.appendChild(link);
        });
      }

      results.hidden = false;
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        input.value = "";
        results.hidden = true;
        input.blur();
      }
    });

    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) {
        results.hidden = true;
      }
    });

    wrapper.append(input, results);
    return wrapper;
  };

  const renderSidebar = (config, context) => {
    const interfaceConfig = config.interface || {};

    if (
      !context.section ||
      interfaceConfig.secondaryNavigation !== "module-chapters"
    ) {
      return;
    }

    const main = document.querySelector("main") ||
      getOrCreate("main", "main", "site-main", document.body);

    const sidebar = getOrCreate(
      "[data-secondary-navigation]",
      "aside",
      "secondary-navigation",
      document.body
    );

    sidebar.replaceChildren();
    sidebar.setAttribute("aria-label", "Module chapters");

    const heading = createElement(
      "h2",
      "sidebar-heading",
      context.section.label
    );

    const chapterList = createElement("ol", "chapter-navigation-list");

    (context.section.chapters || []).forEach((chapter) => {
      const item = createElement("li", "chapter-navigation-item");
      const link = createLink(
        chapter.label,
        chapter.path,
        "chapter-navigation-link"
      );

      if (context.chapter && context.chapter.id === chapter.id) {
        item.classList.add("is-active");
      }

      item.appendChild(link);
      chapterList.appendChild(item);
    });

    sidebar.append(heading, chapterList);

    if (main.parentNode === document.body) {
      document.body.insertBefore(sidebar, main);
    }
  };

  const renderBreadcrumbs = (config, context) => {
    if (!(config.interface || {}).showBreadcrumbs) {
      return;
    }

    const main = document.querySelector("main") ||
      getOrCreate("main", "main", "site-main", document.body);

    const breadcrumbs = getOrCreate(
      "[data-breadcrumbs]",
      "nav",
      "breadcrumbs",
      main
    );

    breadcrumbs.replaceChildren();
    breadcrumbs.setAttribute("aria-label", "Breadcrumb");

    const list = createElement("ol", "breadcrumb-list");

    const homeItem = createElement("li", "breadcrumb-item");
    homeItem.appendChild(
      createLink(
        config.site.homeLabel || "Home",
        config.site.home || "index.html"
      )
    );
    list.appendChild(homeItem);

    if (context.section) {
      const moduleItem = createElement("li", "breadcrumb-item");

      if (context.chapter) {
        moduleItem.appendChild(
          createLink(context.section.label, context.section.path)
        );
      } else {
        moduleItem.appendChild(
          createElement("span", "", context.section.label)
        );
      }

      list.appendChild(moduleItem);
    }

    if (context.chapter) {
      const chapterItem = createElement("li", "breadcrumb-item");
      chapterItem.appendChild(
        createElement("span", "", context.chapter.label)
      );
      list.appendChild(chapterItem);
    }

    breadcrumbs.appendChild(list);
  };

  const renderPreviousNext = (config, context) => {
    if (
      !(config.interface || {}).showPreviousNext ||
      !context.section ||
      !context.chapter
    ) {
      return;
    }

    const chapters = context.section.chapters || [];
    const currentIndex = chapters.findIndex(
      (chapter) => chapter.id === context.chapter.id
    );

    if (currentIndex === -1) {
      return;
    }

    const main = document.querySelector("main") ||
      getOrCreate("main", "main", "site-main", document.body);

    const navigation = getOrCreate(
      "[data-page-navigation]",
      "nav",
      "page-navigation",
      main
    );

    navigation.replaceChildren();
    navigation.setAttribute("aria-label", "Chapter navigation");

    const previous = chapters[currentIndex - 1];
    const next = chapters[currentIndex + 1];

    if (previous) {
      const previousLink = createLink(
        `← ${previous.label}`,
        previous.path,
        "previous-chapter"
      );
      navigation.appendChild(previousLink);
    } else {
      navigation.appendChild(
        createElement("span", "previous-chapter is-disabled")
      );
    }

    if (next) {
      const nextLink = createLink(
        `${next.label} →`,
        next.path,
        "next-chapter"
      );
      navigation.appendChild(nextLink);
    } else {
      navigation.appendChild(
        createElement("span", "next-chapter is-disabled")
      );
    }
  };

  const renderFooter = (config) => {
    const footer = getOrCreate(
      "[data-site-footer]",
      "footer",
      "site-footer",
      document.body
    );

    footer.replaceChildren();

    footer.appendChild(
      createElement("p", "footer-text", config.site.footer || "")
    );
  };

  const renderPageTitle = (config, context) => {
    const site = config.site || {};
    let title = site.pageTitle || site.name || "UPSC GS-II";

    if (context.chapter) {
      title = `${context.chapter.label} | ${site.name}`;
    } else if (context.section) {
      title = `${context.section.label} | ${site.name}`;
    } else if (isCurrentPath(site.home || "index.html")) {
      title = site.homeTitle || title;
    }

    document.title = title;

    const heading = document.querySelector("[data-page-title]");

    if (heading) {
      if (context.chapter) {
        heading.textContent = context.chapter.label;
      } else if (context.section) {
        heading.textContent = context.section.label;
      } else {
        heading.textContent = site.homeTitle || site.name || "";
      }
    }
  };

  const initialise = async () => {
    try {
      const response = await fetch(configUrl.href);

      if (!response.ok) {
        throw new Error(
          `Unable to load navigation configuration (${response.status}).`
        );
      }

      const config = await response.json();

      if (!config || !Array.isArray(config.sections)) {
        throw new Error("Navigation configuration has an invalid structure.");
      }

      const context = getPageContext(config);

      renderHeader(config);
      renderSidebar(config, context);
      renderBreadcrumbs(config, context);
      renderPreviousNext(config, context);
      renderFooter(config);
      renderPageTitle(config, context);

      document.documentElement.classList.add("navigation-ready");
    } catch (error) {
      console.error("Navigation initialisation failed:", error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
