/*
 * Copyright (C) 2026 Fluxer Contributors
 *
 * This file is part of Fluxer.
 *
 * Fluxer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Fluxer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Fluxer. If not, see <https://www.gnu.org/licenses/>.
 */

import * as AccessibilityActionCreators from '@app/actions/AccessibilityActionCreators';
import styles from '@app/components/modals/tabs/appearance_tab/CustomJsTab.module.css';
import {Textarea} from '@app/components/form/Input';
import {Button} from '@app/components/uikit/button/Button';
import AccessibilityStore from '@app/stores/AccessibilityStore';
import {Trans, useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useCallback} from 'react';

export const CustomJsTabContent: React.FC = observer(() => {
	const {t} = useLingui();
	const customJs = AccessibilityStore.customJs ?? '';

	const handleChange = useCallback(
		(event: React.ChangeEvent<HTMLTextAreaElement>) => {
			const value = event.target.value;
			AccessibilityActionCreators.update({customJs: value.length > 0 ? value : null});
		},
		[],
	);

	const handleClear = useCallback(() => {
		AccessibilityActionCreators.update({customJs: null});
	}, []);

	return (
		<div className={styles.container}>
			<p className={styles.description}>
				<Trans>
					Write custom JavaScript that runs when the app loads. Use this to add custom animations, sounds, or
					any other client-side behaviour. Changes take effect immediately — the script is re-executed each
					time you save.
				</Trans>
			</p>
			<div className={styles.warning}>
				<Trans>
					⚠️ Custom JS runs with full access to the page. Only paste code you trust completely.
				</Trans>
			</div>
			<Textarea
				label={t`Custom JavaScript`}
				placeholder={t`// Add custom animations, sounds, or other client-side behaviour here.\n// Example: document.body.style.cursor = 'crosshair';`}
				minRows={6}
				maxRows={20}
				value={customJs}
				onChange={handleChange}
			/>
			<div className={styles.buttonGroup}>
				<Button variant="secondary" fitContent onClick={handleClear} disabled={customJs.length === 0}>
					<Trans>Clear custom JS</Trans>
				</Button>
			</div>
		</div>
	);
});
