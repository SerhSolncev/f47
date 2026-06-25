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

	// dropdown
	const header = document.querySelector('.js-header');
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

			toggleHeader(!isOpen ? block : null);

			if (!isOpen) {
				const searchInput = block.querySelector('.js-search-input');
				if (searchInput) {
					block.addEventListener('transitionend', () => searchInput.focus(), { once: true });
				}
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
			if (el !== excludeBtn && el !== excludeBlock) el.classList.remove('show');
		});
	}
})
