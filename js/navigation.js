
/*
 * Shared dynamic site controller
 * Configuration: data/navigation.json
 *
 * Responsibilities:
 * 1. Generate the site header and primary navigation.
 * 2. Generate the module dropdown and chapter counts.
 * 3. Generate module and chapter search.
 * 4. Generate the module chapter sidebar.
 * 5. Populate module landing pages from configuration.
 * 6. Generate the home page module directory.
 * 7. Generate breadcrumbs and previous/next navigation.
 * 8. Generate the shared footer and document titles.
 *
 * Supports GitHub Pages project sites and root-level hosting.
 */

(() => {
  "use strict";

  const SCRIPT_PATH = "js/navigation.js";
  const CONFIG_PATH = "data/navigation.json";

  // ---------------------------------------------------------
  // 1. Determine the site root
  // ---------------------------------------------------------

  const scriptElement =
    document.currentScript ||
    document.querySelector(`script[src*="${SCRIPT_PATH}"]`);

  if (!scriptElement || !scriptElement.src) {
    console.error("Navigation: unable to determine the site root.");
    return;
  }

  const scriptUrl = new URL(scriptElement.src, window.location.href);

  const rootPath = scriptUrl.pathname.replace(
    /js\/navigation\.js$/,
    ""
  );

  const siteRoot = new URL(rootPath, scriptUrl.origin);
  const configUrl = new URL(CONFIG_PATH, siteRoot);

  // ---------------------------------------------------------
  // 2. Shared utility functions
  // ---------------------------------------------------------

  const normalizePath = (path) => {
    let decodedPath = path;

    try {
      decodedPath = decodeURIComponent(path);
    } catch (error) {
      console.warn("Navigation: unable to decode path.", path);
    }

    return (
      decodedPath
        .replace(/\\/g, "/")
        .replace(/\/+/g, "/")
        .replace(/\/$/, "") || "/"
    );
  };

  const currentPath = normalizePath(window.location.pathname);

  const resolveSitePath = (path) =>
    new URL(path, siteRoot).href;

  const isCurrentPath = (path) => {
    if (!path) return false;

    return (
      normalizePath(new URL(path, siteRoot).pathname) === currentPath
    );
  };

  const createElement = (tag, className = "", text) => {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined && text !== null) {
      element.textContent = String(text);
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

  const getOrCreate = (selector, tag, className, parent) => {
    let element = document.querySelector(selector);

    if (!element) {
      element = createElement(tag, className);
      parent.appendChild(element);
    }

    return element;
  };

  const getPageContext = (config) => {
    for (const section of config.sections || []) {
      if (isCurrentPath(section.path)) {
        return {
          section,
          chapter: null,
          pageType: "module"
        };
      }

      const chapter = (section.chapters || []).find((item) =>
        isCurrentPath(item.path)
      );

      if (chapter) {
        return {
          section,
          chapter,
          pageType: "chapter"
        };
      }
    }

    return {
      section: null,
      chapter: null,
      pageType: "home"
    };
  };

  const setText = (selector, value) => {
    const element = document.querySelector(selector);

    if (element && value !== undefined && value !== null) {
      element.textContent = value;
    }
  };

  // ---------------------------------------------------------
  // 3. Site header and primary navigation
  // ---------------------------------------------------------

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
    header.classList.add("site-header");

    const headerInner = createElement("div", "site-header-inner");

    // Brand

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

    // Primary navigation

    const primaryNav = createElement("nav", "primary-navigation");

    primaryNav.setAttribute(
      "aria-label",
      "Primary navigation"
    );

    primaryNav.appendChild(
      createLink(
        site.homeLabel || "Home",
        site.home || "index.html"
      )
    );

    // Module dropdown

    if (
      interfaceConfig.primaryNavigation === "module-dropdown"
    ) {
      const dropdown = createElement("details", "module-dropdown");

      const summary = createElement("summary", "", "Modules");

      summary.setAttribute(
        "aria-label",
        "Browse all modules"
      );

      const moduleList = createElement(
        "div",
        "module-dropdown-list"
      );

      (config.sections || []).forEach((section) => {
        const item = createLink(
          section.label,
          section.path,
          "module-dropdown-link"
        );

        if (
          interfaceConfig.showModuleNumbers &&
          section.number
        ) {
          item.prepend(
            createElement(
              "span",
              "module-number",
              section.number
            )
          );
        }

        if (
          interfaceConfig.showChapterCounts &&
          Array.isArray(section.chapters)
        ) {
          item.appendChild(
            createElement(
              "span",
              "module-count",
              section.chapters.length
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

  // ---------------------------------------------------------
  // 4. Search across modules and chapters
  // ---------------------------------------------------------

  const renderSearch = (config) => {
    const wrapper = createElement("div", "site-search");

    const input = createElement("input", "site-search-input");

    input.type = "search";
    input.placeholder = "Search modules and chapters";
    input.setAttribute(
      "aria-label",
      "Search modules and chapters"
    );
    input.autocomplete = "off";

    const results = createElement(
      "div",
      "site-search-results"
    );

    results.hidden = true;
    results.setAttribute("role", "listbox");

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
        .filter((item) =>
          item.label.toLowerCase().includes(query)
        )
        .slice(0, 12);

      if (matches.length === 0) {
        results.appendChild(
          createElement(
            "p",
            "search-no-results",
            "No matching pages found."
          )
        );
      } else {
        matches.forEach((item) => {
          const link = createLink(
            item.label,
            item.path,
            "search-result"
          );

          link.setAttribute("role", "option");

          link.appendChild(
            createElement(
              "span",
              "search-result-type",
              item.type
            )
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

  // ---------------------------------------------------------
  // 5. Home page module directory
  // ---------------------------------------------------------

  const renderHomeDirectory = (config) => {
    const interfaceConfig = config.interface || {};

    const directory = document.querySelector(
      "[data-module-directory]"
    );

    if (!directory) return;

    directory.replaceChildren();

    const heading = createElement(
      "h3",
      "module-group-heading",
      "Available Modules"
    );

    const moduleList = createElement("ul", "module-list");

    (config.sections || []).forEach((section) => {
      const item = createElement("li", "module-list-item");

      const link = createLink(
        section.label,
        section.path,
        "module-directory-link"
      );

      if (
        interfaceConfig.showModuleNumbers &&
        section.number
      ) {
        link.prepend(
          createElement(
            "span",
            "module-number",
            section.number
          )
        );
      }

      item.appendChild(link);

      if (section.description) {
        item.appendChild(
          createElement(
            "p",
            "module-description",
            section.description
          )
        );
      }

      if (
        interfaceConfig.showChapterCounts &&
        Array.isArray(section.chapters)
      ) {
        item.appendChild(
          createElement(
            "span",
            "module-count",
            `${section.chapters.length} chapters`
          )
        );
      }

      moduleList.appendChild(item);
    });

    directory.append(heading, moduleList);
  };

  // ---------------------------------------------------------
  // 6. Module landing page content
  // ---------------------------------------------------------

  const renderModulePage = (config, context) => {
    if (!context.section || context.chapter) return;

    const section = context.section;

    // Module title and introductory information

    setText("[data-page-title]", section.label);
    setText("[data-module-description]", section.description);
    setText("[data-module-explanation]", section.explanation);

    // Apply a consistent class to the explanation paragraph.

    const explanation = document.querySelector(
      "[data-module-explanation]"
    );

    if (explanation) {
      explanation.classList.add("module-explanation");
    }

    // Study guidance

    const guidanceList = document.querySelector(
      "[data-study-guidance-list]"
    );

    if (guidanceList) {
      guidanceList.replaceChildren();

      (section.studyGuidance || []).forEach((guidance) => {
        guidanceList.appendChild(
          createElement("li", "", guidance)
        );
      });
    }

    // Examination relevance

    setText(
      "[data-exam-relevance-text]",
      section.examRelevance
    );

    // Chapter directory

    const chapterList = document.querySelector(
      "[data-chapter-list]"
    );

    if (chapterList) {
      chapterList.replaceChildren();

      (section.chapters || []).forEach((chapter) => {
        const item = createElement("li", "chapter-directory-item");

        const link = createLink(
          chapter.label,
          chapter.path,
          "chapter-directory-link"
        );

        item.appendChild(link);

        if (chapter.status) {
          const status = createElement(
            "span",
            `chapter-status status-${chapter.status}`,
            chapter.status === "ready"
              ? "Available"
              : chapter.status === "planned"
                ? "Planned"
                : chapter.status
          );

          item.appendChild(status);
        }

        chapterList.appendChild(item);
      });
    }
  };

  // ---------------------------------------------------------
  // 7. Module chapter sidebar
  // ---------------------------------------------------------

  const renderSidebar = (config, context) => {
    const interfaceConfig = config.interface || {};

    if (
      !context.section ||
      interfaceConfig.secondaryNavigation !== "module-chapters"
    ) {
      return;
    }

    const sidebar = getOrCreate(
      "[data-secondary-navigation]",
      "aside",
      "secondary-navigation",
      document.body
    );

    sidebar.replaceChildren();

    sidebar.classList.add("secondary-navigation");

    sidebar.setAttribute(
      "aria-label",
      "Module chapters"
    );

    const heading = createElement(
      "h2",
      "sidebar-heading",
      context.section.label
    );

    const chapterList = createElement(
      "ol",
      "chapter-navigation-list"
    );

    (context.section.chapters || []).forEach((chapter) => {
      const item = createElement(
        "li",
        "chapter-navigation-item"
      );

      const link = createLink(
        chapter.label,
        chapter.path,
        "chapter-navigation-link"
      );

      if (
        context.chapter &&
        context.chapter.id === chapter.id
      ) {
        item.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }

      item.appendChild(link);
      chapterList.appendChild(item);
    });

    sidebar.append(heading, chapterList);
  };

  // ---------------------------------------------------------
  // 8. Breadcrumbs
  // ---------------------------------------------------------

  const renderBreadcrumbs = (config, context) => {
    if (!(config.interface || {}).showBreadcrumbs) {
      return;
    }

    const main = document.querySelector("main");

    if (!main) return;

    const breadcrumbs = getOrCreate(
      "[data-breadcrumbs]",
      "nav",
      "breadcrumbs",
      main
    );

    breadcrumbs.replaceChildren();

    breadcrumbs.setAttribute(
      "aria-label",
      "Breadcrumb"
    );

    const list = createElement("ol", "breadcrumb-list");

    const homeItem = createElement(
      "li",
      "breadcrumb-item"
    );

    homeItem.appendChild(
      createLink(
        config.site.homeLabel || "Home",
        config.site.home || "index.html"
      )
    );

    list.appendChild(homeItem);

    if (context.section) {
      const moduleItem = createElement(
        "li",
        "breadcrumb-item"
      );

      if (context.chapter) {
        moduleItem.appendChild(
          createLink(
            context.section.label,
            context.section.path
          )
        );
      } else {
        moduleItem.appendChild(
          createElement(
            "span",
            "",
            context.section.label
          )
        );
      }

      list.appendChild(moduleItem);
    }

    if (context.chapter) {
      const chapterItem = createElement(
        "li",
        "breadcrumb-item"
      );

      chapterItem.appendChild(
        createElement(
          "span",
          "",
          context.chapter.label
        )
      );

      list.appendChild(chapterItem);
    }

    breadcrumbs.appendChild(list);
  };

  // ---------------------------------------------------------
  // 9. Previous and next chapter navigation
  // ---------------------------------------------------------

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

    if (currentIndex === -1) return;

    const main = document.querySelector("main");

    if (!main) return;

    const navigation = getOrCreate(
      "[data-page-navigation]",
      "nav",
      "page-navigation",
      main
    );

    navigation.replaceChildren();

    navigation.setAttribute(
      "aria-label",
      "Chapter navigation"
    );

    const previous = chapters[currentIndex - 1];
    const next = chapters[currentIndex + 1];

    if (previous) {
      navigation.appendChild(
        createLink(
          `← ${previous.label}`,
          previous.path,
          "previous-chapter"
        )
      );
    } else {
      navigation.appendChild(
        createElement(
          "span",
          "previous-chapter is-disabled"
        )
      );
    }

    if (next) {
      navigation.appendChild(
        createLink(
          `${next.label} →`,
          next.path,
          "next-chapter"
        )
      );
    } else {
      navigation.appendChild(
        createElement(
          "span",
          "next-chapter is-disabled"
        )
      );
    }
  };

  // ---------------------------------------------------------
  // 10. Shared footer
  // ---------------------------------------------------------

  const renderFooter = (config) => {
    const footer = getOrCreate(
      "[data-site-footer]",
      "footer",
      "site-footer",
      document.body
    );

    footer.replaceChildren();

    footer.classList.add("site-footer");

    footer.appendChild(
      createElement(
        "p",
        "footer-text",
        config.site.footer || ""
      )
    );
  };

  // ---------------------------------------------------------
  // 11. Document and page titles
  // ---------------------------------------------------------

  const renderPageTitle = (config, context) => {
    const site = config.site || {};

    let title =
      site.pageTitle ||
      site.name ||
      "UPSC GS-II";

    if (context.chapter) {
      title = `${context.chapter.label} | ${site.name}`;
    } else if (context.section) {
      title = `${context.section.label} | ${site.name}`;
    } else if (isCurrentPath(site.home || "index.html")) {
      title = site.homeTitle || title;
    }

    document.title = title;

    const heading = document.querySelector(
      "[data-page-title]"
    );

    if (!heading) return;

    if (context.chapter) {
      heading.textContent = context.chapter.label;
    } else if (context.section) {
      heading.textContent = context.section.label;
    } else {
      heading.textContent =
        site.homeTitle ||
        site.name ||
        "";
    }
  };

  // ---------------------------------------------------------
  // 12. Initialise the complete site
  // ---------------------------------------------------------

  const initialise = async () => {
    try {
      const response = await fetch(configUrl.href);

      if (!response.ok) {
        throw new Error(
          `Unable to load navigation configuration (${response.status}).`
        );
      }

      const config = await response.json();

      if (
        !config ||
        !config.site ||
        !Array.isArray(config.sections)
      ) {
        throw new Error(
          "Navigation configuration has an invalid structure."
        );
      }

      const context = getPageContext(config);

      // Shared site elements

      renderHeader(config);
      renderSidebar(config, context);
      renderBreadcrumbs(config, context);
      renderPreviousNext(config, context);
      renderFooter(config);
      renderPageTitle(config, context);

      // Page-specific dynamic content

      if (context.pageType === "home") {
        renderHomeDirectory(config);
      }

      if (context.pageType === "module") {
        renderModulePage(config, context);
      }

      document.documentElement.classList.add(
        "navigation-ready"
      );

      console.info(
        "UPSC GS-II site initialised successfully.",
        {
          pageType: context.pageType,
          module: context.section
            ? context.section.id
            : null,
          chapter: context.chapter
            ? context.chapter.id
            : null
        }
      );

    } catch (error) {
      console.error(
        "Navigation initialisation failed:",
        error
      );

      document.documentElement.classList.add(
        "navigation-error"
      );
    }
  };

  // ---------------------------------------------------------
  // 13. Start after the document is ready
  // ---------------------------------------------------------

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialise,
      { once: true }
    );
  } else {
    initialise();
  }

})();
