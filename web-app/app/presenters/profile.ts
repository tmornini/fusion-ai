import {
    $, $input, $select, $textarea,
} from '../dom';
import type { Profile } from '../adapters';

export class ProfilePresenter {
    readonly #profile: Profile;

    constructor(profile: Profile) {
        this.#profile = profile;
    }

    avatarInitials(): string {
        return this.#profile
            .firstName.charAt(0)
            + this.#profile
                .lastName.charAt(0);
    }

    initStrengths(
        set: Set<string>,
    ): void {
        for (
            const s of this.#profile
                .strengths
        ) {
            set.add(s);
        }
    }

    populateForm(): void {
        const p = this.#profile;
        const avatarEl = $(
            '#profile-avatar-initials',
            document,
        );
        if (avatarEl) {
            avatarEl.textContent =
                this.avatarInitials();
        }
        $input(
            '#profile-first-name',
            document,
        )!.value = p.firstName;
        $input(
            '#profile-last-name',
            document,
        )!.value = p.lastName;
        $input(
            '#profile-email',
            document,
        )!.value = p.email;
        $input(
            '#profile-phone',
            document,
        )!.value = p.phone;
        $input(
            '#profile-role',
            document,
        )!.value = p.role;
        $select(
            '#profile-department',
            document,
        )!.value = p.department;
        $textarea(
            '#profile-bio',
            document,
        )!.value = p.bio;
    }
}
