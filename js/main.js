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
		smoothWheel: true
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
		let groupWidth =
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

			// Пересчитываем groupWidth при изменении размера окна
			const updatedGroups = runningString.querySelectorAll(".running-string__group");
			if (updatedGroups.length >= 2) {
				const newGroupWidth =
					updatedGroups[1].getBoundingClientRect().left -
					updatedGroups[0].getBoundingClientRect().left;

				if (newGroupWidth > 0) {
					groupWidth = newGroupWidth;
				}
			}
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
})
