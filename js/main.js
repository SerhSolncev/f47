document.addEventListener('DOMContentLoaded', (event) => {
	document.body.classList.add('loading');

	setTimeout(() => {
		document.body.classList.add('loaded');
	}, 300)

	// "modernizr" func"
	function isTouchDevice() {
		return 'ontouchstart' in window || navigator.maxTouchPoints;
	}

	if(!isTouchDevice()) {
		document.body.classList.add('desktop-device')
	}

	const getElement = (context, selector) => {
		if (!context && !selector) {
			return null;
		}

		return context.querySelector(selector);
	};

	// lazy-load
	let lazyLoadInstance = new LazyLoad({
		elements_selector: ".lazy"
	});

	const mutationObserver = new MutationObserver(() => {
		lazyLoadInstance.update();
	});

	mutationObserver.observe(document.body, {
		childList: true,
		subtree: true
	});

	gsap.registerPlugin(ScrollTrigger);

	const lenis = new Lenis({
		smoothWheel: true,
		duration: window.innerWidth <= 768 ? 0.6 : 1.2,
		prevent: (node) =>
			node.closest('.micromodal-slide') !== null ||
			node.closest('.js-toggle-block') !== null
	});

	lenis.on('scroll', ScrollTrigger.update);

	gsap.ticker.add((time) => {
		lenis.raf(time * 1000);
	});

	gsap.ticker.lagSmoothing(0);

	// header
	const header = document.querySelector('.js-header');
	if (!header) return;

	const setHeaderHeight = () => {
		document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
	};

	setHeaderHeight();
	new ResizeObserver(setHeaderHeight).observe(header);

	window.addEventListener('scroll', () => {
		header.classList.toggle('onscroll', window.scrollY > header.offsetHeight);
	}, { passive: true });


	// running string
	document.querySelectorAll(".js-running-string").forEach(initRunningString);

	function initRunningString(runningString) {

		const group = runningString.querySelector(".running-string__group");
		const containerWidth = runningString.parentElement.clientWidth;

		while (
			runningString.scrollWidth < containerWidth * 2 ||
			runningString.querySelectorAll(".running-string__group").length < 2
			) {
			runningString.appendChild(group.cloneNode(true));
		}

		const groups = runningString.querySelectorAll(".running-string__group");
		const groupWidth =
			groups[1].getBoundingClientRect().left -
			groups[0].getBoundingClientRect().left;

		function getSpeed() {
			const desktop = parseFloat(runningString.dataset.speed) || 1;
			const mobile = parseFloat(runningString.dataset.speedMobile) || desktop;
			return window.innerWidth < 768 ? mobile : desktop;
		}

		let speed = getSpeed();
		let paused = false;
		let isDragging = false;

		let x = 0;
		let targetX = 0;

		function normalize(val) {
			val = val % groupWidth;
			if (val > 0) val -= groupWidth;
			return val;
		}

		// hover

		if ("pauseOnHover" in runningString.dataset) {
			runningString.addEventListener("mouseenter", () => {
				if (!isDragging) paused = true;
			});
			runningString.addEventListener("mouseleave", () => {
				if (!isDragging) paused = false;
			});
		}

		// drag

		let dragStartX = 0;
		let dragStartOffset = 0;
		let pointerX = 0;
		let velocity = 0;
		let lastPointerX = 0;
		let lastTime = 0;
		let inertiaRaf = null;

		if ("moveOn" in runningString.dataset) {

			runningString.style.cursor = "grab";

			function onDragStart(clientX) {
				isDragging = true;
				paused = true;

				if (inertiaRaf) {
					cancelAnimationFrame(inertiaRaf);
					inertiaRaf = null;
				}

				dragStartX = clientX;
				dragStartOffset = targetX;

				pointerX = clientX;
				lastPointerX = clientX;
				lastTime = performance.now();
				velocity = 0;

				runningString.style.cursor = "grabbing";
				document.body.style.userSelect = "none";
			}

			function onDragMove(clientX) {
				if (!isDragging) return;

				pointerX = clientX;

				const now = performance.now();
				const dt = now - lastTime;
				if (dt > 0) {
					velocity = (clientX - lastPointerX) / dt;
				}
				lastPointerX = clientX;
				lastTime = now;
			}

			function onDragEnd() {
				if (!isDragging) return;
				isDragging = false;
				runningString.style.cursor = "grab";
				document.body.style.userSelect = "";

				const startX = targetX;
				const isMobile = window.innerWidth < 768;
				const multiplier = isMobile ? 100 : 250;
				const maxDistance = isMobile ? groupWidth * 0.5 : groupWidth; // не дальше половины группы на мобилке
				const rawDistance = velocity * multiplier;
				const distance = Math.max(-maxDistance, Math.min(maxDistance, rawDistance));
				const duration = isMobile ? 500 : 700;
				const startTime = performance.now();

				function inertia(now) {
					const t = Math.min((now - startTime) / duration, 1);
					const ease = 1 - Math.pow(1 - t, 3);
					targetX = normalize(startX + distance * ease);

					if (t < 1) {
						inertiaRaf = requestAnimationFrame(inertia);
					} else {
						inertiaRaf = null;
						paused = false;
					}
				}

				inertiaRaf = requestAnimationFrame(inertia);
			}

			// house
			runningString.addEventListener("mousedown", e => onDragStart(e.clientX));
			window.addEventListener("mousemove", e => onDragMove(e.clientX));
			window.addEventListener("mouseup", onDragEnd);

			// touch
			runningString.addEventListener("touchstart", e => {
				onDragStart(e.touches[0].clientX);
			}, { passive: true });

			runningString.addEventListener("touchmove", e => {
				e.preventDefault();
				onDragMove(e.touches[0].clientX);
			}, { passive: false });

			runningString.addEventListener("touchend", onDragEnd);
		}

		// animate

		function animate() {
			if (isDragging) {
				targetX = dragStartOffset + (pointerX - dragStartX);
			} else if (!paused && !inertiaRaf) {
				targetX -= speed;
			}

			// Нормализуем только targetX
			targetX = normalize(targetX);

			let diff = targetX - x;

			if (diff > groupWidth / 2) diff -= groupWidth;
			if (diff < -groupWidth / 2) diff += groupWidth;

			x += diff * 0.12;
			x = normalize(x);

			runningString.style.transform = `translate3d(${x}px,0,0)`;
			requestAnimationFrame(animate);
		}

		animate();

		window.addEventListener("resize", () => {
			speed = getSpeed();
		});
	}

	// dropdown

	function trapFocus(block) {
		const focusable = block.querySelectorAll(
			'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		if (focusable.length) focusable[0].focus();
	}

	function lockFocus(block) {
		if (block.hasAttribute('data-no-lock-focus')) return;
		block.querySelectorAll(
			'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
		).forEach(el => el.setAttribute('tabindex', '-1'));
	}

	function unlockFocus(block) {
		block.querySelectorAll('[tabindex="-1"]')
		.forEach(el => el.removeAttribute('tabindex'));
	}
	function toggleHeader(block) {
		if (!header) return;
		if (block && block.hasAttribute('data-hide-header')) {
			header.classList.add('hide');
		} else {
			const hasHideBlock = document.querySelector('.js-toggle-block.show[data-hide-header]');
			if (!hasHideBlock) header.classList.remove('hide');
		}
	}

	document.addEventListener('click', (e) => {
		const toggleBtn = e.target.closest('.js-toggle-btn');
		const closeBtn = e.target.closest('.js-toggle-close');

		if (toggleBtn) {
			e.stopPropagation();
			const id = toggleBtn.dataset.id;
			const block = document.querySelector(`.js-toggle-block[data-id="${id}"]`);
			const isOpen = block.classList.contains('show');

			if (!isOpen) closeAllDropdowns(toggleBtn, block);

			toggleBtn.classList.toggle('show', !isOpen);
			block.classList.toggle('show', !isOpen);

			// aria-expanded
			if (toggleBtn.hasAttribute('aria-expanded')) {
				toggleBtn.setAttribute('aria-expanded', !isOpen);
			}

			toggleHeader(!isOpen ? block : null);

			if (!isOpen) {
				const searchInput = block.querySelector('.js-search-input');
				if (searchInput) {
					block.addEventListener('transitionend', () => searchInput.focus(), { once: true });
				}
				unlockFocus(block);
				block.addEventListener('transitionend', () => trapFocus(block), { once: true });
			} else {
				lockFocus(block);
			}

			if (block.hasAttribute('data-block-scroll')) {
				const bp = block.getAttribute('data-block-scroll');
				const needLock = !bp || window.innerWidth <= Number(bp);
				document.body.style.overflow = (!isOpen && needLock) ? 'hidden' : '';
			}
		}

		else if (closeBtn) {
			e.stopPropagation();
			const blockToClose = closeBtn.closest('.js-toggle-block');
			if (blockToClose) {
				const id = blockToClose.dataset.id;
				const toggleBtn = document.querySelector(`.js-toggle-btn[data-id="${id}"]`);
				blockToClose.classList.remove('show');
				if (toggleBtn) toggleBtn.classList.remove('show');
			}

			toggleHeader(null);

			if (blockToClose && blockToClose.hasAttribute('data-block-scroll')) {
				document.body.style.overflow = '';
			}
		}

		else {
			const clickedInsideToggle = e.target.closest('.js-toggle-btn, .js-toggle-block, .modal-form');
			const hasOpenBlocks = document.querySelector('.js-toggle-block.show');

			if (!clickedInsideToggle && hasOpenBlocks) {
				closeAllDropdowns();
				toggleHeader(null);
				document.body.style.overflow = '';
			}
		}

	});

	function closeAllDropdowns(excludeBtn = null, excludeBlock = null) {
		document.querySelectorAll('.js-toggle-btn.show, .js-toggle-block.show').forEach(el => {
			if (el !== excludeBtn && el !== excludeBlock) {
				el.classList.remove('show');
				if (el.hasAttribute('aria-expanded')) {
					el.setAttribute('aria-expanded', 'false');
				}
				// блокируем фокус в закрытых блоках
				if (el.classList.contains('js-toggle-block')) {
					lockFocus(el);
				}
			}
		});
	}

	document.querySelectorAll('.js-toggle-block:not(.show)').forEach(lockFocus);

	// попап вид звязку

	document.addEventListener('change', function (e) {
		if (!e.target.classList.contains('js-connect-radio')) return;

		var value = e.target.value;

		document.querySelectorAll('.js-connect-type').forEach(function (el) {
			el.classList.toggle('hide', el.dataset.type !== value);
		});
	});

	document.addEventListener('DOMContentLoaded', function () {
		var checked = document.querySelector('.js-connect-radio:checked');
		if (checked) {
			checked.dispatchEvent(new Event('change'));
		}
	});

	// міні валідація

	document.querySelectorAll('.js-validate-form').forEach(function (form) {
		const phoneInput = form.querySelector('[type="tel"]');
		const nameInput = form.querySelector('[data-no-numbers]');

		if (phoneInput) {
			phoneInput.addEventListener('input', function () {
				this.value = this.value.replace(/[^\d+\s()\-]/g, '');
			});
		}

		if (nameInput) {
			nameInput.addEventListener('input', function () {
				this.value = this.value.replace(/[0-9]/g, '');
			});
		}

		function getErrorTarget(input) {
			const checkerWrap = input.closest('.simple-checker, .smile-checker');
			return checkerWrap || input;
		}

		function isFieldVisible(input) {
			if (input.offsetParent === null) return false; // сам инпут скрыт (display:none у него или родителя)
			const parent = input.parentElement;
			if (parent && (parent.offsetParent === null)) return false; // прямой родитель скрыт
			return true;
		}

		function getErrorTextWrapper(input) {
			return input.closest('.input-item, .default-select');
		}

		function showFieldErrorText(input, isValid) {
			const wrapper = getErrorTextWrapper(input);
			if (!wrapper) return;

			let errorText = wrapper.querySelector('.error-field-text');

			if (!isValid && input.hasAttribute('data-validte-text')) {
				if (!errorText) {
					errorText = document.createElement('div');
					errorText.className = 'error-field-text';
					wrapper.appendChild(errorText);
				}
				errorText.textContent = input.getAttribute('data-validte-text');
			} else if (errorText) {
				errorText.remove();
			}
		}

		function validateField(input) {
			if (!isFieldVisible(input)) {
				input.classList.remove('field-error');
				return true;
			}

			let valid = true;

			if (input.classList.contains('js-input-mask')) {
				valid = input.inputmask ? input.inputmask.isComplete() : true;
			} else if (input.hasAttribute('required')) {
				if (input.type === 'checkbox') {
					valid = input.checked;
				} else {
					valid = input.value.trim().length > 0;
				}
			}

			if (valid && input.type === 'email' && input.value.trim().length > 0) {
				valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
			}

			if (valid && input.type === 'url' && input.value.trim().length > 0) {
				try {
					new URL(input.value.trim());
				} catch {
					valid = false;
				}
			}

			if (valid && input.hasAttribute('data-password-confirm')) {
				const targetId = input.getAttribute('data-password-confirm');
				const targetField = form.querySelector('#' + targetId);
				const targetVal = targetField ? targetField.value : '';
				valid = input.value === targetVal && input.value.length > 0;
			}

			input.classList.toggle('field-error', !valid);
			return valid;
		}

		function runValidation(input) {
			const valid = validateField(input);
			getErrorTarget(input).classList.toggle('field-error', !valid);
			showFieldErrorText(input, valid);
			return valid;
		}

		const fields = form.querySelectorAll('[required], .js-input-mask, [data-password-confirm], [type="email"], [type="url"]');

		fields.forEach(function (input) {
			input.addEventListener('blur', function () {
				runValidation(input);
			});

			input.addEventListener('change', function () {
				runValidation(input);
			});

			input.addEventListener('input', function () {
				if (getErrorTarget(input).classList.contains('field-error')) {
					runValidation(input);
				}

				const dependentConfirms = form.querySelectorAll('[data-password-confirm="' + this.id + '"]');
				dependentConfirms.forEach(function (confirmInput) {
					if (getErrorTarget(confirmInput).classList.contains('field-error')) {
						runValidation(confirmInput);
					}
				});
			});
		});

		const sendBtn = form.querySelector('.js-send-form');

		if (sendBtn) {
			sendBtn.addEventListener('click', async function (e) {
				e.preventDefault();

				let isValid = true;

				fields.forEach(function (input) {
					if (!runValidation(input)) isValid = false;
				});

				if (!isValid) return;

				// // --- PROD ---
				// const url = form.dataset.url;
				// const formData = new FormData(form);
				// try {
				//     sendBtn.disabled = true;
				//     const response = await fetch(url, {
				//         method: 'POST',
				//         body: formData
				//     });
				//     if (response.ok) {
				//         onSuccess();
				//     } else {
				//         console.error('Помилка сервера:', response.status);
				//     }
				// } catch (err) {
				//     console.error('Помилка відправки:', err);
				// } finally {
				//     sendBtn.disabled = false;
				// }

				// --- ЗАГЛУШКА ---
				onSuccess();
			});
		}

		function onSuccess() {
			form.reset();
			form.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
			form.querySelectorAll('.error-field-text').forEach(el => el.remove());

			const successBlock = form.querySelector('.js-form-success');
			if (successBlock) {
				successBlock.classList.add('show');
				setTimeout(() => successBlock.classList.remove('show'), 3000);
			}
		}
	});

	// tabs
	class Tabs {
		constructor(container) {
			this.container = container;
			this.init();
		}

		init() {
			this.container.querySelectorAll("[data-tab]").forEach((tab) => {
				tab.addEventListener("click", (e) => this.activateTab(e.target));
			});
		}
		activateTab(tab) {
			const tabGroup = tab.closest("[data-tabs]");
			const contentGroup = tabGroup.querySelector("[data-contents]");
			const tabName = tab.dataset.tab;

			tabGroup.querySelectorAll("[data-tab]").forEach((t) => {
				if (t.closest("[data-tabs]") === tabGroup) {
					t.classList.remove("is-active");
					if (t.hasAttribute("aria-selected")) {
						t.setAttribute("aria-selected", "false");
					}
				}
			});

			contentGroup.querySelectorAll("[data-content]").forEach((c) => {
				if (c.closest("[data-contents]") === contentGroup) {
					c.classList.remove("is-active");
					c.classList.remove("is-visible");
				}
			});

			tab.classList.add("is-active");
			if (tab.hasAttribute("aria-selected")) {
				tab.setAttribute("aria-selected", "true");
			}

			const activeContents = contentGroup.querySelectorAll(`[data-content="${tabName}"]`);
			activeContents.forEach((el) => {
				el.classList.add("is-active");
				setTimeout(() => el.classList.add("is-visible"), 30);
			});
		}
	}

	document.querySelectorAll("[data-tabs]").forEach((tabsContainer) => new Tabs(tabsContainer));

	// acc
	const accs = document.querySelectorAll('.js-acc-wrap');

	function handleAccordion(parent) {
		const buttons = parent.querySelectorAll('.js-open-acc');
		const parentItems = parent.querySelectorAll('.js-acc');

		parentItems.forEach((parentItem) => {
			const accBlock = parentItem.querySelector('.js-acc-block');
			const btn = parentItem.querySelector('.js-open-acc');

			accBlock.style.transition = 'none';
			if (parentItem.classList.contains('active')) {
				accBlock.style.maxHeight = accBlock.scrollHeight + "px";
				if (btn) btn.setAttribute('aria-expanded', 'true');
				accBlock.setAttribute('aria-hidden', 'false');
			} else {
				if (btn) btn.setAttribute('aria-expanded', 'false');
				accBlock.setAttribute('aria-hidden', 'true');
			}

			setTimeout(() => {
				accBlock.style.transition = 'max-height 0.2s linear, margin 0.2s linear';
			}, 10);

			let previousHeight = accBlock.scrollHeight;
			setInterval(() => {
				if (parentItem.classList.contains('active')) {
					const currentHeight = accBlock.scrollHeight;
					if (currentHeight !== previousHeight) {
						accBlock.style.maxHeight = currentHeight + "px";
						previousHeight = currentHeight;
					}
				}
			}, 100);
		});

		buttons.forEach((button) => {
			button.addEventListener('click', (event) => {
				if (event.target.closest('.js-tooltip')) return;

				const contents = button.closest('.js-acc-wrap').querySelectorAll('.js-acc-block');
				const contentsItem = button.closest('.js-acc').querySelector('.js-acc-block');
				const parentWrap = button.closest('.js-acc-wrap');
				const isMultiple = parentWrap.hasAttribute('data-multiple');

				if (button.closest('.js-acc').classList.contains('active')) {
					contentsItem.style.maxHeight = '0';
					button.closest('.js-acc').classList.remove('active');
					button.setAttribute('aria-expanded', 'false');
					contentsItem.setAttribute('aria-hidden', 'true');

					if (button.closest('.js-state-inputs')) {
						contentsItem.querySelectorAll('.input-item__input').forEach((input) => {
							input.disabled = true;
						});
					}
				} else {
					if (!isMultiple) {
						contents.forEach((block) => {
							block.style.maxHeight = '0';
							block.setAttribute('aria-hidden', 'true');
						});

						button.closest('.js-acc-wrap').querySelectorAll('.js-acc').forEach((parentItem) => {
							parentItem.classList.remove('active');
							const btn = parentItem.querySelector('.js-open-acc');
							if (btn) btn.setAttribute('aria-expanded', 'false');
						});
					}

					if (button.closest('.js-state-inputs')) {
						contentsItem.querySelectorAll('.input-item__input').forEach((input) => {
							input.disabled = false;
						});
					}

					contentsItem.style.maxHeight = contentsItem.scrollHeight + "px";
					button.closest('.js-acc').classList.add('active');
					button.setAttribute('aria-expanded', 'true');
					contentsItem.setAttribute('aria-hidden', 'false');
				}

				parentWrap.style.maxHeight = 'initial';
			});

			const nestedAccordions = button.closest('.js-acc').querySelectorAll('.js-acc-wrap');
			nestedAccordions.forEach((nestedAccordion) => {
				handleAccordion(nestedAccordion);
			});
		});
	}

	if (accs.length > 0) {
		accs.forEach((parent) => {
			handleAccordion(parent);
		});
	}

	const observerAcc = new MutationObserver((mutationsList) => {
		mutationsList.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				if (!(node instanceof Element)) return;

				if (node.classList.contains('js-acc-wrap')) {
					handleAccordion(node);
				}

				node.querySelectorAll('.js-acc-wrap').forEach((nestedNode) => {
					handleAccordion(nestedNode);
				});
			});
		});
	});

	observerAcc.observe(document.body, {
		childList: true,
		subtree: true,
	});

	// якорся з меню
	const buttons = document.querySelectorAll('.js-anchor-btn');
	const mobMenus = document.querySelectorAll('[data-id="mob-menu"]');
	const sections = [];

	// Собираем секции, соответствующие кнопкам
	buttons.forEach(btn => {
		const id = btn.dataset.id;
		const section = document.getElementById(id) || document.querySelector(`.js-anchor-block[id="${id}"]`);
		if (section) {
			sections.push({ btn, section });
		}
	});

	function getHeaderHeight() {
		return header ? header.offsetHeight : 0;
	}

	function getOffset(btn) {
		const DEFAULT_OFFSET = 50;
		const customOffset = parseInt(btn.dataset.offset, 10);
		return isNaN(customOffset) ? DEFAULT_OFFSET : customOffset;
	}

	// Клик по кнопке — скролл к блоку
	buttons.forEach(btn => {
		btn.addEventListener('click', function () {
			const id = btn.dataset.id;
			const target = document.getElementById(id) || document.querySelector(`.js-anchor-block[id="${id}"]`);
			if (!target) return;

			const headerHeight = getHeaderHeight();
			const offset = getOffset(btn);
			const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - offset;

			window.scrollTo({
				top: targetPosition,
				behavior: 'smooth'
			});

			setActiveButton(btn);

			mobMenus.forEach(menu => menu.classList.remove('show'));
		});
	});

	function setActiveButton(activeBtn) {
		buttons.forEach(b => b.classList.remove('is-active'));
		activeBtn.classList.add('is-active');
	}

	function onScroll() {
		const headerHeight = getHeaderHeight();
		const scrollPosition = window.scrollY + headerHeight + 1;

		let currentSection = null;

		sections.forEach(({ btn, section }) => {
			const sectionTop = section.getBoundingClientRect().top + window.scrollY - headerHeight - getOffset(btn);
			const sectionBottom = sectionTop + section.offsetHeight;

			if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
				currentSection = btn;
			}
		});

		if (currentSection) {
			setActiveButton(currentSection);
		} else {
			buttons.forEach(btn => btn.classList.remove('is-active'));
		}
	}

	let scrollTimeout;
	window.addEventListener('scroll', function () {
		if (scrollTimeout) {
			window.cancelAnimationFrame(scrollTimeout);
		}
		scrollTimeout = window.requestAnimationFrame(onScroll);
	});

	onScroll();

	// скрипт которйы обрезает текст

	const seoBlocks = document.querySelectorAll(".js-seo-block");

	seoBlocks.forEach((block) => {
		const seoContent = block.querySelector("[data-text-block]");
		const toggleButton = block.querySelector("[data-toggle-text]");

		const hasHeightAttr = seoContent.hasAttribute("data-height-show");
		const desktopCollapsedValue = hasHeightAttr
			? parseInt(seoContent.getAttribute("data-height-show"), 10)
			: parseInt(seoContent.getAttribute("data-symbols-show"), 10);

		const mobileOnlyBreakpoint = seoContent.hasAttribute("data-mobile-only")
			? parseInt(seoContent.getAttribute("data-mobile-only"), 10)
			: null;

		const changeCountBreakpoint = seoContent.hasAttribute("data-change-count-breakpoint")
			? parseInt(seoContent.getAttribute("data-change-count-breakpoint"), 10)
			: null;

		const mobileCollapsedValue = hasHeightAttr
			? (seoContent.hasAttribute("data-height-show-mob")
				? parseInt(seoContent.getAttribute("data-height-show-mob"), 10)
				: null)
			: (seoContent.hasAttribute("data-symbols-show-mob")
				? parseInt(seoContent.getAttribute("data-symbols-show-mob"), 10)
				: null);

		function isMobileOnlyActive() {
			if (mobileOnlyBreakpoint === null) return true;
			return window.innerWidth <= mobileOnlyBreakpoint;
		}

		function getCollapsedHeight() {
			if (
				changeCountBreakpoint !== null &&
				mobileCollapsedValue !== null &&
				window.innerWidth <= changeCountBreakpoint
			) {
				return mobileCollapsedValue;
			}
			return desktopCollapsedValue;
		}

		let fullHeight = seoContent.scrollHeight;
		let isFullTextShown = false;
		let isBound = false;

		function showFullText() {
			seoContent.style.height = fullHeight + "px";
			isFullTextShown = true;
			toggleButton.querySelector(".link__text").textContent = toggleButton.getAttribute("data-opened-text");
		}

		function hideFullText() {
			seoContent.style.height = getCollapsedHeight() + "px";
			isFullTextShown = false;
			toggleButton.querySelector(".link__text").textContent = toggleButton.getAttribute("data-closed-text");
		}

		function resetToAuto() {
			seoContent.style.height = "auto";
			isFullTextShown = false;
			toggleButton.classList.remove('opened');
			block.classList.remove('opened');
		}

		function onToggleClick() {
			if (isFullTextShown) {
				toggleButton.classList.remove('opened');
				block.classList.remove('opened');
				hideFullText();
			} else {
				toggleButton.classList.add('opened');
				block.classList.add('opened');
				showFullText();
			}
		}

		function bindToggle() {
			if (isBound) return;
			toggleButton.addEventListener("click", onToggleClick);
			isBound = true;
		}

		function unbindToggle() {
			if (!isBound) return;
			toggleButton.removeEventListener("click", onToggleClick);
			isBound = false;
		}

		function update() {
			if (isMobileOnlyActive()) {
				seoContent.style.height = "auto";
				fullHeight = seoContent.scrollHeight;

				const collapsedHeight = getCollapsedHeight();

				if (fullHeight > collapsedHeight) {
					block.classList.remove('no-cut');
					hideFullText();
					toggleButton.style.display = "";
					bindToggle();
				} else {
					block.classList.add('no-cut');
					toggleButton.style.display = "none";
					unbindToggle();
				}
			} else {
				resetToAuto();
				toggleButton.style.display = "none";
				unbindToggle();
			}
		}

		update();
		window.addEventListener("resize", update);
	});

	// modals
	if (typeof MicroModal !== 'undefined') {
		MicroModal.init({
			onShow: modal => console.info(`${modal.id} is shown`),
			onClose: modal => console.info(`${modal.id} is hidden`),
			openClass: 'is-open'
		});
	}

	// simple popup якщо розиітка одразу на сторінці

	document.addEventListener('click', async function (e) {
		const button = e.target.closest('.js-call-popup-static');
		if(button) {
			const id = button.getAttribute('data-id')
			let isAnyModalOpen = document.querySelector('.micromodal-slide.is-open');
			if (isAnyModalOpen) {
				MicroModal.close()
			}

			MicroModal.show(id, {
				disableFocus: true,
				awaitCloseAnimation: true,
				disableScroll: true,
				onShow: function (modal) {
					let isAnyModalOpen = document.querySelector('.micromodal-slide.is-open');
				},
				onClose: function (modal) {
					setTimeout(() => {
						let isAnyModalOpen = document.querySelector('.micromodal-slide.is-open');
						if (!isAnyModalOpen && document.body.style.overflow === 'hidden') {
							document.body.style.overflow = '';
						}
					}, 300);
					document.body.style.overflow = '';
				}
			});
		}

	});

	// тільки ціфрі
	document.addEventListener('input', function(event) {
		if (event.target.classList.contains('js-input-number')) {
			event.target.value = event.target.value.replace(/[^0-9/+]/g, '');
		}
	});


	// анімація при скролі і лоаду сторінки

	document.querySelectorAll('.js-big-title').forEach(el => {
		if (el.hasAttribute('data-off-animate') && window.innerWidth <= parseFloat(el.dataset.offAnimate)) return;

		const trigger = el.dataset.trigger === 'topBody'
			? document.body
			: el.closest('.js-big-title-trigger') || el.parentElement;

		const startTop = el.dataset.startTop || '20%';
		const endTop = el.dataset.endTop || '80%';
		const startX = parseFloat(el.dataset.startX) ?? 100;
		const endX = parseFloat(el.dataset.endX) ?? -200;

		gsap.fromTo(el,
			{
				xPercent: startX,
				yPercent: -50,
				top: startTop,
			},
			{
				xPercent: endX,
				yPercent: -50,
				top: endTop,
				ease: 'none',
				scrollTrigger: {
					trigger,
					start: el.dataset.start || 'center center',
					end: () => 'bottom+=' + (trigger.offsetHeight * 0.2) + ' bottom',
					scrub: 0.7,
				}
			}
		);
	});

	document.querySelectorAll('.js-show-on-scroll').forEach(el => {
		if (el.hasAttribute('data-off-animate') && window.innerWidth <= parseFloat(el.dataset.offAnimate)) return;

		const direction = el.dataset.direction || 'bottom';
		const dy = parseFloat(el.dataset.y) || 50;
		const start = el.dataset.start || 'top 85%';
		const delay = parseFloat(el.dataset.delay) || 0;
		const duration = parseFloat(el.dataset.duration) || 1;

		const from = {
			opacity: 0,
			duration,
			ease: 'power3.out',
			delay,
		};

		if (direction === 'bottom') {
			from.y = dy;
		} else if (direction === 'top') {
			from.y = -dy;
		} else if (direction === 'left') {
			from.x = -150;
			from.y = -100;
			from.rotation = -15;
		} else if (direction === 'right') {
			from.x = 150;
			from.y = -100;
			from.rotation = 15;
		}

		// Анимация сразу после загрузки
		if (el.hasAttribute('data-on-load')) {
			gsap.from(el, from);
			return;
		}

		// Анимация по скроллу
		gsap.from(el, {
			...from,
			scrollTrigger: {
				trigger: el,
				start,
				toggleActions: 'play none none reverse',
			}
		});
	});

	document.querySelectorAll('.js-go-away-on-scroll').forEach(el => {
		const direction= el.dataset.direction || 'left';
		const position= parseFloat(el.dataset.position) || 0;
		const x = parseFloat(el.dataset.x) || 200;
		const start = el.dataset.start || 'top top';
		const end = el.dataset.end   || '+=800';

		if (el.hasAttribute('data-off-animate') && window.innerWidth <= parseFloat(el.dataset.offAnimate)) return;

		let xFrom = 0, yFrom = 0;
		let xTo = 0, yTo = 0;
		if (direction === 'left')   { xFrom = -x; }
		if (direction === 'right')  { xFrom = x; }
		if (direction === 'bottom') { yFrom = position; }
		if (direction === 'top')    { yFrom = -position; }

		const trigger = el.dataset.trigger === 'topBody'
			? document.body
			: el.closest('.js-go-away-trigger') || el.parentElement;

		const hasReverse = el.hasAttribute('data-reverse');

		gsap.fromTo(el,
			{ x: hasReverse ? xFrom : 0, y: hasReverse ? yFrom : 0 },
			{
				x: hasReverse ? 0 : xFrom,
				y: hasReverse ? 0 : yFrom,
				ease: 'none',
				scrollTrigger: {
					trigger,
					start,
					end,
					scrub: 0.5,
				}
			}
		);
	});

	document.querySelectorAll('.js-scroll-rotate').forEach(el => {
		const degree  = parseFloat(el.dataset.degre) || 30;
		const isRight = el.hasAttribute('data-rotate-right');

		if (el.hasAttribute('data-off-animate') && window.innerWidth <= parseFloat(el.dataset.offAnimate)) return;

		const from = isRight ? degree : -degree;
		const to   = isRight ? -degree : degree;

		gsap.fromTo(el,
			{ rotation: from },
			{
				rotation: to,
				ease: 'none',
				scrollTrigger: {
					trigger: el,
					start: 'top bottom',
					end: 'bottom top',
					scrub: true,
				}
			}
		);
	});
})
