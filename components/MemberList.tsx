"use client";

import { formatPublicName } from "@/lib/names";
import type { TeamMember } from "@/lib/types";

type StatusBadgeProps = {
  isConfirmed: boolean;
};

export function StatusBadge({ isConfirmed }: StatusBadgeProps) {
  return (
    <span className={`badge ${isConfirmed ? "badge--ok" : "badge--warn"}`}>
      {isConfirmed ? "Из справочника" : "Вручную"}
    </span>
  );
}

type MemberListProps = {
  members: TeamMember[];
  showActions?: boolean;
  onRemove?: (memberId: string) => void;
};

export function MemberList({
  members,
  showActions = false,
  onRemove,
}: MemberListProps) {
  if (members.length === 0) {
    return <p className="empty-note">Пока никого нет</p>;
  }

  return (
    <ul className="member-list">
      {members.map((member) => (
        <li key={member.id} className="member-list__item">
          <div>
            <div className="member-list__top">
              <strong>
                {formatPublicName(member.fullName, member.isConfirmed)}
              </strong>
              <StatusBadge isConfirmed={member.isConfirmed} />
            </div>
            <p>{member.department}</p>
            <small>
              {member.role === "captain"
                ? "Капитан"
                : member.role === "starter"
                  ? "Основа"
                  : "Запасной"}
            </small>
          </div>
          {showActions && member.role !== "captain" && onRemove ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => onRemove(member.id)}
            >
              Убрать
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
