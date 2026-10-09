// Generated from docs/05-implementation/UCMS_Database_Design.dbml.
// Run python3 server/src/infra/db/generate-ucms-schema.py after DBML changes.
// Do not edit by hand.
export const ucmsEnums = {
  "accountState": [
    "Active",
    "Locked"
  ],
  "roleScope": [
    "system",
    "club"
  ],
  "clubState": [
    "Pending Setup",
    "Active",
    "Suspended",
    "Dissolving",
    "Dissolved"
  ],
  "clubApplicationState": [
    "Draft",
    "Submitted",
    "Under Review",
    "Revision Requested",
    "Approved",
    "Rejected",
    "Withdrawn",
    "Expired"
  ],
  "campaignState": [
    "Draft",
    "Published",
    "Accepting Applications",
    "Screening",
    "Completed",
    "Cancelled"
  ],
  "recruitmentApplicationState": [
    "Draft",
    "Submitted",
    "Screening",
    "Shortlisted",
    "Accepted",
    "Rejected",
    "Waitlisted",
    "Onboarded",
    "Withdrawn",
    "Declined"
  ],
  "membershipState": [
    "Active",
    "Inactive",
    "Left",
    "Banned"
  ],
  "eventState": [
    "Draft",
    "Pending Approval",
    "Under Review",
    "Revision Requested",
    "Approved",
    "Upcoming",
    "Ongoing",
    "Completed",
    "Report Submitted",
    "Closed",
    "Cancelled",
    "Rejected",
    "Expired"
  ],
  "eventOrganizerType": [
    "CLUB",
    "ICPDP"
  ],
  "eventInvitationStatus": [
    "Pending",
    "Accepted",
    "Declined",
    "Expired",
    "Withdrawn"
  ],
  "registrationState": [
    "Confirmed",
    "Waitlisted",
    "Cancelled"
  ],
  "attendanceMethod": [
    "self",
    "manual",
    "walk-in"
  ],
  "eventBudgetState": [
    "Approved",
    "Cancelled",
    "Disbursed",
    "Settlement Submitted",
    "Reconciliation Pending",
    "Reconciled",
    "Recovery Pending",
    "Closed"
  ],
  "budgetFlowKind": [
    "Advance",
    "TopUp",
    "Refund"
  ],
  "expenseReviewOutcome": [
    "Accepted",
    "Rejected"
  ],
  "bookingState": [
    "Draft",
    "Requested",
    "Under Review",
    "Revision Requested",
    "Approved",
    "Rejected",
    "In Use",
    "Completed",
    "Cancelled",
    "Released"
  ],
  "violationState": [
    "Open",
    "Under Investigation",
    "Awaiting Club Response",
    "Decision Issued",
    "Corrective Action",
    "Resolved",
    "Closed"
  ],
  "feedbackRecipient": [
    "CLUB",
    "ICPDP"
  ],
  "complaintState": [
    "Submitted",
    "Under Triage",
    "Dismissed",
    "Forwarded",
    "Club Responded",
    "Escalated",
    "Closed",
    "Withdrawn"
  ],
  "evaluationState": [
    "Draft",
    "Data Ready",
    "Under Review",
    "Finalized",
    "Published"
  ],
  "reportState": [
    "Draft",
    "Submitted",
    "Accepted",
    "Returned for correction"
  ],
  "reviewOutcome": [
    "Request revision",
    "Approve",
    "Reject"
  ],
  "approvalTaskState": [
    "Open",
    "Escalated",
    "Decided",
    "Closed"
  ],
  "nominationState": [
    "Pending Confirmation",
    "Confirmed",
    "Returned"
  ],
  "termState": [
    "Planned",
    "Active",
    "Closed"
  ],
  "notificationState": [
    "Queued",
    "Sent",
    "Failed",
    "Read"
  ],
  "conflictResult": [
    "No Conflict",
    "Warning",
    "Blocking Conflict"
  ]
} as const;

export const ucmsTables = {
  "users": {
    "fields": {
      "email": {
        "type": "string",
        "unique": true,
        "required": true
      },
      "googleSubject": {
        "type": "string",
        "unique": true
      },
      "displayName": {
        "type": "string",
        "required": true
      },
      "avatarUrl": {
        "type": "string"
      },
      "accountState": {
        "type": "accountState",
        "required": true,
        "default": "Active"
      },
      "lockReason": {
        "type": "string"
      },
      "lockedBy": {
        "type": "objectId"
      },
      "lockedAt": {
        "type": "datetime"
      },
      "lastLoginAt": {
        "type": "datetime"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      },
      "updatedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "email"
        ],
        "unique": true,
        "name": "uq_users_email"
      },
      {
        "fields": [
          "accountState"
        ],
        "name": "ix_users_state"
      }
    ]
  },
  "studentProfiles": {
    "fields": {
      "userId": {
        "type": "objectId",
        "unique": true,
        "required": true
      },
      "studentCode": {
        "type": "string",
        "unique": true
      },
      "fullName": {
        "type": "string",
        "required": true
      },
      "faculty": {
        "type": "string"
      },
      "major": {
        "type": "string"
      },
      "cohort": {
        "type": "string"
      },
      "syncedAt": {
        "type": "datetime"
      }
    },
    "indexes": []
  },
  "permissions": {
    "fields": {
      "code": {
        "type": "string",
        "unique": true,
        "required": true
      },
      "name": {
        "type": "string",
        "required": true
      },
      "module": {
        "type": "string",
        "required": true
      },
      "scope": {
        "type": "roleScope",
        "required": true
      },
      "isLeaderReserved": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "description": {
        "type": "string"
      }
    },
    "indexes": []
  },
  "roles": {
    "fields": {
      "code": {
        "type": "string",
        "unique": true,
        "required": true
      },
      "name": {
        "type": "string",
        "required": true
      },
      "scope": {
        "type": "roleScope",
        "required": true
      },
      "permissionCodes": {
        "type": "string[]",
        "required": true
      },
      "isSystem": {
        "type": "bool",
        "default": false
      }
    },
    "indexes": []
  },
  "userRoleAssignments": {
    "fields": {
      "userId": {
        "type": "objectId",
        "required": true
      },
      "roleId": {
        "type": "objectId",
        "required": true
      },
      "grantedBy": {
        "type": "objectId",
        "required": true
      },
      "grantedAt": {
        "type": "datetime",
        "required": true
      },
      "revokedBy": {
        "type": "objectId"
      },
      "revokedAt": {
        "type": "datetime"
      },
      "reason": {
        "type": "string"
      }
    },
    "indexes": [
      {
        "fields": [
          "userId",
          "revokedAt"
        ],
        "name": "ix_ura_user_active"
      }
    ]
  },
  "policyVersions": {
    "fields": {
      "minFoundingMembers": {
        "type": "int",
        "required": true
      },
      "formRequirements": {
        "type": "json",
        "required": true
      },
      "reportDeadlines": {
        "type": "json",
        "required": true
      },
      "conflictThresholdMinutes": {
        "type": "int",
        "required": true
      },
      "feedbackWindowHours": {
        "type": "int",
        "required": true
      },
      "feedbackMinRespondents": {
        "type": "int",
        "required": true
      },
      "allowOverbooking": {
        "type": "bool",
        "required": true
      },
      "enforceOverdueReportBlock": {
        "type": "bool",
        "required": true
      },
      "academicCalendar": {
        "type": "json",
        "required": true
      },
      "effectiveFrom": {
        "type": "datetime",
        "required": true
      },
      "createdBy": {
        "type": "objectId",
        "required": true
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "effectiveFrom"
        ],
        "name": "ix_policy_effective"
      }
    ]
  },
  "clubs": {
    "fields": {
      "code": {
        "type": "string",
        "unique": true,
        "required": true
      },
      "name": {
        "type": "string",
        "required": true
      },
      "field": {
        "type": "string",
        "required": true
      },
      "state": {
        "type": "clubState",
        "required": true,
        "default": "Pending Setup"
      },
      "description": {
        "type": "text"
      },
      "contactEmail": {
        "type": "string"
      },
      "contactPhone": {
        "type": "string"
      },
      "charterUrl": {
        "type": "string"
      },
      "logoUrl": {
        "type": "string"
      },
      "channels": {
        "type": "json"
      },
      "operatingScope": {
        "type": "string"
      },
      "institutionalFields": {
        "type": "json"
      },
      "dissolution": {
        "type": "json"
      },
      "suspension": {
        "type": "json"
      },
      "sourceApplicationId": {
        "type": "objectId"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      },
      "updatedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "state",
          "field"
        ],
        "name": "ix_clubs_state_field"
      },
      {
        "fields": [
          "name"
        ],
        "name": "ix_clubs_name"
      }
    ]
  },
  "clubFields": {
    "fields": {
      "name": {
        "type": "string",
        "required": true
      },
      "normalizedName": {
        "type": "string",
        "required": true
      },
      "sortOrder": {
        "type": "int",
        "required": true,
        "default": 0
      },
      "isActive": {
        "type": "bool",
        "required": true,
        "default": true
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      },
      "updatedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "normalizedName"
        ],
        "unique": true,
        "name": "uq_club_field_name"
      },
      {
        "fields": [
          "isActive",
          "sortOrder"
        ],
        "name": "ix_club_field_active"
      }
    ]
  },
  "clubApplications": {
    "fields": {
      "clubName": {
        "type": "string",
        "required": true
      },
      "field": {
        "type": "string",
        "required": true
      },
      "objectives": {
        "type": "text"
      },
      "founderUserId": {
        "type": "objectId",
        "required": true
      },
      "draftPayload": {
        "type": "json"
      },
      "state": {
        "type": "clubApplicationState",
        "required": true,
        "default": "Draft"
      },
      "currentVersionNo": {
        "type": "int",
        "required": true,
        "default": 1
      },
      "revisionDeadlineAt": {
        "type": "datetime"
      },
      "createdClubId": {
        "type": "objectId"
      },
      "submittedAt": {
        "type": "datetime"
      },
      "decidedAt": {
        "type": "datetime"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "state",
          "submittedAt"
        ],
        "name": "ix_clubapp_queue"
      },
      {
        "fields": [
          "founderUserId"
        ],
        "name": "ix_clubapp_founder"
      },
      {
        "fields": [
          "state",
          "revisionDeadlineAt"
        ],
        "name": "ix_clubapp_expiry"
      }
    ]
  },
  "clubApplicationVersions": {
    "fields": {
      "applicationId": {
        "type": "objectId",
        "required": true
      },
      "versionNo": {
        "type": "int",
        "required": true
      },
      "payload": {
        "type": "json",
        "required": true
      },
      "foundingMembers": {
        "type": "json",
        "required": true
      },
      "documents": {
        "type": "json",
        "required": true
      },
      "proposedRoleStructure": {
        "type": "json",
        "required": true
      },
      "submittedBy": {
        "type": "objectId",
        "required": true
      },
      "submittedAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "applicationId",
          "versionNo"
        ],
        "unique": true,
        "name": "uq_clubappver"
      }
    ]
  },
  "clubSuspensionRequests": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "requestedBy": {
        "type": "objectId",
        "required": true
      },
      "reason": {
        "type": "text",
        "required": true
      },
      "expectedFrom": {
        "type": "datetime",
        "required": true
      },
      "expectedTo": {
        "type": "datetime",
        "required": true
      },
      "obligationsPlan": {
        "type": "text"
      },
      "recoveryPlan": {
        "type": "text"
      },
      "state": {
        "type": "string",
        "required": true
      },
      "decidedBy": {
        "type": "objectId"
      },
      "decidedAt": {
        "type": "datetime"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_susp_club_state"
      }
    ]
  },
  "clubTerms": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "name": {
        "type": "string",
        "required": true
      },
      "startAt": {
        "type": "datetime",
        "required": true
      },
      "endAt": {
        "type": "datetime",
        "required": true
      },
      "state": {
        "type": "termState",
        "required": true,
        "default": "Planned"
      },
      "previousTermId": {
        "type": "objectId"
      },
      "confirmedBy": {
        "type": "objectId"
      },
      "confirmedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_terms_club_state"
      },
      {
        "fields": [
          "clubId",
          "endAt"
        ],
        "name": "ix_terms_expiry"
      }
    ]
  },
  "clubPositions": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "code": {
        "type": "string",
        "required": true
      },
      "name": {
        "type": "string",
        "required": true
      },
      "unit": {
        "type": "string"
      },
      "isBoardSeat": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "isLeaderRole": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "isDefaultMemberRole": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "isSingleHolder": {
        "type": "bool",
        "required": true,
        "default": true
      },
      "permissionCodes": {
        "type": "string[]",
        "required": true
      },
      "isActive": {
        "type": "bool",
        "required": true,
        "default": true
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "code"
        ],
        "unique": true,
        "name": "uq_position_club_code"
      }
    ]
  },
  "clubDepartments": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "name": {
        "type": "string",
        "required": true
      },
      "normalizedName": {
        "type": "string",
        "required": true
      },
      "description": {
        "type": "text"
      },
      "sortOrder": {
        "type": "int",
        "required": true,
        "default": 0
      },
      "isActive": {
        "type": "bool",
        "required": true,
        "default": true
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      },
      "updatedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "normalizedName"
        ],
        "unique": true,
        "name": "uq_department_club_name"
      },
      {
        "fields": [
          "clubId",
          "isActive",
          "sortOrder"
        ],
        "name": "ix_department_structure"
      }
    ]
  },
  "clubPositionAssignments": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "termId": {
        "type": "objectId",
        "required": true
      },
      "positionId": {
        "type": "objectId",
        "required": true
      },
      "membershipId": {
        "type": "objectId",
        "required": true
      },
      "effectiveFrom": {
        "type": "datetime",
        "required": true
      },
      "effectiveTo": {
        "type": "datetime"
      },
      "assignedBy": {
        "type": "objectId",
        "required": true
      },
      "confirmedBy": {
        "type": "objectId"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "termId",
          "positionId"
        ],
        "name": "ix_assign_lookup"
      },
      {
        "fields": [
          "membershipId",
          "effectiveTo"
        ],
        "name": "ix_assign_member_active"
      }
    ]
  },
  "clubRoleStructureVersions": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "versionNo": {
        "type": "int",
        "required": true
      },
      "effectiveFrom": {
        "type": "datetime",
        "required": true
      },
      "source": {
        "type": "string",
        "required": true
      },
      "sourceRefId": {
        "type": "objectId"
      },
      "roles": {
        "type": "json",
        "required": true
      },
      "createdBy": {
        "type": "objectId",
        "required": true
      },
      "reason": {
        "type": "string"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "versionNo"
        ],
        "unique": true,
        "name": "uq_role_structure_version"
      }
    ]
  },
  "boardNominations": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "termId": {
        "type": "objectId",
        "required": true
      },
      "state": {
        "type": "nominationState",
        "required": true,
        "default": "Pending Confirmation"
      },
      "submittedBy": {
        "type": "objectId",
        "required": true
      },
      "submittedAt": {
        "type": "datetime",
        "required": true
      },
      "decidedBy": {
        "type": "objectId"
      },
      "decidedAt": {
        "type": "datetime"
      },
      "reason": {
        "type": "string"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_nom_club_state"
      }
    ]
  },
  "boardNominationSeats": {
    "fields": {
      "nominationId": {
        "type": "objectId",
        "required": true
      },
      "positionId": {
        "type": "objectId",
        "required": true
      },
      "membershipId": {
        "type": "objectId",
        "required": true
      },
      "state": {
        "type": "nominationState",
        "required": true,
        "default": "Pending Confirmation"
      },
      "reason": {
        "type": "string"
      }
    },
    "indexes": [
      {
        "fields": [
          "nominationId",
          "positionId"
        ],
        "unique": true,
        "name": "uq_nom_seat"
      }
    ]
  },
  "transitionPlans": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "fromTermId": {
        "type": "objectId",
        "required": true
      },
      "toTermId": {
        "type": "objectId",
        "required": true
      },
      "candidates": {
        "type": "json",
        "required": true
      },
      "outstandingObligations": {
        "type": "json",
        "required": true
      },
      "handoverItems": {
        "type": "json"
      },
      "state": {
        "type": "nominationState",
        "required": true,
        "default": "Pending Confirmation"
      },
      "submittedBy": {
        "type": "objectId",
        "required": true
      },
      "submittedAt": {
        "type": "datetime",
        "required": true
      },
      "decidedBy": {
        "type": "objectId"
      },
      "decidedAt": {
        "type": "datetime"
      },
      "followUpConditions": {
        "type": "json"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_transition_club_state"
      }
    ]
  },
  "recruitmentCampaigns": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "title": {
        "type": "string",
        "required": true
      },
      "positions": {
        "type": "json",
        "required": true
      },
      "criteria": {
        "type": "text"
      },
      "windowStart": {
        "type": "datetime",
        "required": true
      },
      "windowEnd": {
        "type": "datetime",
        "required": true
      },
      "capacity": {
        "type": "int",
        "required": true
      },
      "selectionSteps": {
        "type": "json"
      },
      "formSchema": {
        "type": "json",
        "required": true
      },
      "rubric": {
        "type": "json"
      },
      "state": {
        "type": "campaignState",
        "required": true,
        "default": "Draft"
      },
      "publishedBy": {
        "type": "objectId"
      },
      "publishedAt": {
        "type": "datetime"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_campaign_club_state"
      },
      {
        "fields": [
          "state",
          "windowStart",
          "windowEnd"
        ],
        "name": "ix_campaign_window"
      }
    ]
  },
  "recruitmentApplications": {
    "fields": {
      "campaignId": {
        "type": "objectId",
        "required": true
      },
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "userId": {
        "type": "objectId",
        "required": true
      },
      "position": {
        "type": "string"
      },
      "answers": {
        "type": "json",
        "required": true
      },
      "attachments": {
        "type": "json"
      },
      "state": {
        "type": "recruitmentApplicationState",
        "required": true,
        "default": "Draft"
      },
      "decisionOutcome": {
        "type": "string"
      },
      "decisionReason": {
        "type": "string"
      },
      "decidedBy": {
        "type": "objectId"
      },
      "decidedAt": {
        "type": "datetime"
      },
      "submittedAt": {
        "type": "datetime"
      },
      "withdrawnAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "campaignId",
          "userId"
        ],
        "unique": true,
        "name": "uq_recruitapp_campaign_user"
      },
      {
        "fields": [
          "campaignId",
          "state"
        ],
        "name": "ix_recruitapp_screening"
      },
      {
        "fields": [
          "userId",
          "state"
        ],
        "name": "ix_recruitapp_mine"
      }
    ]
  },
  "candidateEvaluations": {
    "fields": {
      "applicationId": {
        "type": "objectId",
        "required": true
      },
      "reviewerId": {
        "type": "objectId",
        "required": true
      },
      "scores": {
        "type": "json",
        "required": true
      },
      "totalScore": {
        "type": "decimal"
      },
      "comment": {
        "type": "text"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "applicationId",
          "reviewerId"
        ],
        "unique": true,
        "name": "uq_candeval"
      }
    ]
  },
  "clubMemberships": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "userId": {
        "type": "objectId",
        "required": true
      },
      "state": {
        "type": "membershipState",
        "required": true,
        "default": "Active"
      },
      "joinedAt": {
        "type": "datetime",
        "required": true
      },
      "leftAt": {
        "type": "datetime"
      },
      "departmentId": {
        "type": "objectId"
      },
      "defaultRole": {
        "type": "string"
      },
      "sourceApplicationId": {
        "type": "objectId"
      },
      "banReason": {
        "type": "string"
      },
      "statusHistory": {
        "type": "json",
        "required": true
      },
      "lastReRegisteredSemester": {
        "type": "string"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "userId"
        ],
        "unique": true,
        "name": "uq_membership_active",
        "partialFilterExpression": {
          "state": {
            "$in": [
              "Active",
              "Inactive"
            ]
          }
        }
      },
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_membership_roster"
      },
      {
        "fields": [
          "userId",
          "state"
        ],
        "name": "ix_membership_mine"
      }
    ]
  },
  "membershipWithdrawalRequests": {
    "fields": {
      "membershipId": {
        "type": "objectId",
        "required": true
      },
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "userId": {
        "type": "objectId",
        "required": true
      },
      "reason": {
        "type": "text",
        "required": true
      },
      "requestedEffectiveDate": {
        "type": "datetime",
        "required": true
      },
      "state": {
        "type": "string",
        "required": true
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      },
      "executedBy": {
        "type": "objectId"
      },
      "executedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_withdrawal_club_state"
      }
    ]
  },
  "events": {
    "fields": {
      "organizerType": {
        "type": "eventOrganizerType",
        "required": true,
        "default": "CLUB"
      },
      "clubId": {
        "type": "objectId"
      },
      "clubName": {
        "type": "string"
      },
      "title": {
        "type": "string",
        "required": true
      },
      "coverImageUrl": {
        "type": "string"
      },
      "objective": {
        "type": "text"
      },
      "startAt": {
        "type": "datetime",
        "required": true
      },
      "endAt": {
        "type": "datetime",
        "required": true
      },
      "semesterCode": {
        "type": "string",
        "required": true
      },
      "venueText": {
        "type": "string"
      },
      "propertyId": {
        "type": "objectId"
      },
      "audienceScope": {
        "type": "string",
        "required": true
      },
      "capacity": {
        "type": "int",
        "required": true
      },
      "confirmedRegistrationCount": {
        "type": "int",
        "required": true,
        "default": 0
      },
      "nextWaitlistPosition": {
        "type": "int",
        "required": true,
        "default": 1
      },
      "waitlistEnabled": {
        "type": "bool",
        "required": true,
        "default": true
      },
      "riskCategory": {
        "type": "string"
      },
      "state": {
        "type": "eventState",
        "required": true,
        "default": "Draft"
      },
      "conflictResult": {
        "type": "conflictResult"
      },
      "conflictDetail": {
        "type": "json"
      },
      "approvalConditions": {
        "type": "json"
      },
      "registrationOpenAt": {
        "type": "datetime"
      },
      "registrationCloseAt": {
        "type": "datetime"
      },
      "checkInCode": {
        "type": "string"
      },
      "checkInOpenAt": {
        "type": "datetime"
      },
      "checkInCloseAt": {
        "type": "datetime"
      },
      "allowWalkIn": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "currentRevisionNo": {
        "type": "int",
        "required": true,
        "default": 1
      },
      "revisionDeadlineAt": {
        "type": "datetime"
      },
      "publishedAt": {
        "type": "datetime"
      },
      "cancelReason": {
        "type": "string"
      },
      "cancelledBy": {
        "type": "objectId"
      },
      "cancelSourceType": {
        "type": "string"
      },
      "isLateCancellation": {
        "type": "bool",
        "default": false
      },
      "attendanceFinalized": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_events_club_state"
      },
      {
        "fields": [
          "state",
          "startAt"
        ],
        "name": "ix_events_schedule"
      },
      {
        "fields": [
          "propertyId",
          "startAt",
          "endAt"
        ],
        "name": "ix_events_conflict"
      },
      {
        "fields": [
          "state",
          "revisionDeadlineAt"
        ],
        "name": "ix_events_expiry"
      },
      {
        "fields": [
          "audienceScope",
          "semesterCode",
          "clubId"
        ],
        "name": "ix_events_scope"
      },
      {
        "fields": [
          "organizerType",
          "state"
        ],
        "name": "ix_events_organizer_state"
      }
    ]
  },
  "eventProposalVersions": {
    "fields": {
      "eventId": {
        "type": "objectId",
        "required": true
      },
      "revisionNo": {
        "type": "int",
        "required": true
      },
      "payload": {
        "type": "json",
        "required": true
      },
      "budgetLines": {
        "type": "json"
      },
      "requestedBudgetTotal": {
        "type": "decimal"
      },
      "conflictResult": {
        "type": "conflictResult"
      },
      "submittedBy": {
        "type": "objectId",
        "required": true
      },
      "submittedAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "eventId",
          "revisionNo"
        ],
        "unique": true,
        "name": "uq_eventrev"
      }
    ]
  },
  "eventInvitations": {
    "fields": {
      "eventId": {
        "type": "objectId",
        "required": true
      },
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "clubName": {
        "type": "string",
        "required": true
      },
      "status": {
        "type": "eventInvitationStatus",
        "required": true,
        "default": "Pending"
      },
      "deadline": {
        "type": "datetime",
        "required": true
      },
      "invitedAt": {
        "type": "datetime",
        "required": true
      },
      "invitedBy": {
        "type": "objectId",
        "required": true
      },
      "respondedAt": {
        "type": "datetime"
      },
      "respondedBy": {
        "type": "objectId"
      },
      "responseNote": {
        "type": "text"
      },
      "responseDetails": {
        "type": "json"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      },
      "updatedAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "eventId",
          "clubId"
        ],
        "unique": true,
        "name": "ix_event_invitations_unique"
      },
      {
        "fields": [
          "clubId",
          "status"
        ],
        "name": "ix_event_invitations_club_status"
      },
      {
        "fields": [
          "status",
          "deadline"
        ],
        "name": "ix_event_invitations_expiry"
      }
    ]
  },
  "eventRegistrations": {
    "fields": {
      "eventId": {
        "type": "objectId",
        "required": true
      },
      "studentId": {
        "type": "objectId",
        "required": true
      },
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "state": {
        "type": "registrationState",
        "required": true,
        "default": "Confirmed"
      },
      "waitlistPosition": {
        "type": "int"
      },
      "answers": {
        "type": "json"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      },
      "cancelledAt": {
        "type": "datetime"
      },
      "promotedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "eventId",
          "studentId"
        ],
        "unique": true,
        "name": "uq_registration"
      },
      {
        "fields": [
          "eventId",
          "state",
          "waitlistPosition"
        ],
        "name": "ix_registration_waitlist"
      },
      {
        "fields": [
          "studentId",
          "state"
        ],
        "name": "ix_registration_mine"
      }
    ]
  },
  "attendances": {
    "fields": {
      "eventId": {
        "type": "objectId",
        "required": true
      },
      "studentId": {
        "type": "objectId",
        "required": true
      },
      "registrationId": {
        "type": "objectId"
      },
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "checkedInAt": {
        "type": "datetime",
        "required": true
      },
      "method": {
        "type": "attendanceMethod",
        "required": true
      },
      "performedBy": {
        "type": "objectId"
      },
      "abnormalFlags": {
        "type": "string[]"
      },
      "correctionReason": {
        "type": "string"
      },
      "finalized": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "finalizedBy": {
        "type": "objectId"
      },
      "finalizedAt": {
        "type": "datetime"
      },
      "unlockedBy": {
        "type": "objectId"
      },
      "unlockReason": {
        "type": "string"
      }
    },
    "indexes": [
      {
        "fields": [
          "eventId",
          "studentId"
        ],
        "unique": true,
        "name": "uq_attendance"
      },
      {
        "fields": [
          "eventId",
          "finalized"
        ],
        "name": "ix_attendance_finalize"
      },
      {
        "fields": [
          "studentId",
          "checkedInAt"
        ],
        "name": "ix_attendance_history"
      }
    ]
  },
  "postEventReports": {
    "fields": {
      "eventId": {
        "type": "objectId",
        "unique": true,
        "required": true
      },
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "preloadedFigures": {
        "type": "json",
        "required": true
      },
      "actualResult": {
        "type": "text",
        "required": true
      },
      "incidents": {
        "type": "text"
      },
      "lessonsLearned": {
        "type": "text"
      },
      "evidence": {
        "type": "json"
      },
      "state": {
        "type": "reportState",
        "required": true,
        "default": "Draft"
      },
      "versionNo": {
        "type": "int",
        "required": true,
        "default": 1
      },
      "lateFlag": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "submittedBy": {
        "type": "objectId"
      },
      "submittedAt": {
        "type": "datetime"
      },
      "decisionOutcome": {
        "type": "string"
      },
      "decisionReason": {
        "type": "string"
      },
      "findingViolationId": {
        "type": "objectId"
      },
      "decidedBy": {
        "type": "objectId"
      },
      "decidedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_pereport_club_state"
      },
      {
        "fields": [
          "state",
          "submittedAt"
        ],
        "name": "ix_pereport_queue"
      }
    ]
  },
  "periodicReports": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "periodCode": {
        "type": "string",
        "required": true
      },
      "periodType": {
        "type": "string",
        "required": true
      },
      "preloadedFigures": {
        "type": "json",
        "required": true
      },
      "narrative": {
        "type": "text"
      },
      "nextPlan": {
        "type": "text"
      },
      "evidence": {
        "type": "json"
      },
      "state": {
        "type": "reportState",
        "required": true,
        "default": "Draft"
      },
      "versionNo": {
        "type": "int",
        "required": true,
        "default": 1
      },
      "lateFlag": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "submittedBy": {
        "type": "objectId"
      },
      "submittedAt": {
        "type": "datetime"
      },
      "decisionOutcome": {
        "type": "string"
      },
      "observation": {
        "type": "string"
      },
      "decidedBy": {
        "type": "objectId"
      },
      "decidedAt": {
        "type": "datetime"
      },
      "dueAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "periodCode"
        ],
        "unique": true,
        "name": "uq_periodicreport"
      },
      {
        "fields": [
          "state",
          "dueAt"
        ],
        "name": "ix_periodicreport_due"
      }
    ]
  },
  "violations": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "originType": {
        "type": "string",
        "required": true
      },
      "originRefId": {
        "type": "objectId"
      },
      "severity": {
        "type": "string",
        "required": true
      },
      "title": {
        "type": "string",
        "required": true
      },
      "description": {
        "type": "text"
      },
      "evidence": {
        "type": "json"
      },
      "state": {
        "type": "violationState",
        "required": true,
        "default": "Open"
      },
      "clubResponse": {
        "type": "json"
      },
      "decisionReason": {
        "type": "text"
      },
      "decisionEvidence": {
        "type": "json"
      },
      "openedBy": {
        "type": "objectId",
        "required": true
      },
      "openedAt": {
        "type": "datetime",
        "required": true
      },
      "decidedBy": {
        "type": "objectId"
      },
      "decidedAt": {
        "type": "datetime"
      },
      "responseDueAt": {
        "type": "datetime"
      },
      "resolvedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_violation_club_state"
      },
      {
        "fields": [
          "state",
          "openedAt"
        ],
        "name": "ix_violation_queue"
      }
    ]
  },
  "correctiveActions": {
    "fields": {
      "violationId": {
        "type": "objectId",
        "required": true
      },
      "description": {
        "type": "text",
        "required": true
      },
      "dueAt": {
        "type": "datetime",
        "required": true
      },
      "state": {
        "type": "string",
        "required": true
      },
      "linkedLifecycleAction": {
        "type": "string"
      },
      "verifiedBy": {
        "type": "objectId"
      },
      "verifiedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "violationId",
          "state"
        ],
        "name": "ix_caction_case"
      }
    ]
  },
  "eventBudgets": {
    "fields": {
      "eventId": {
        "type": "objectId",
        "unique": true,
        "required": true
      },
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "lines": {
        "type": "json",
        "required": true
      },
      "requestedTotal": {
        "type": "decimal",
        "required": true
      },
      "approvedTotal": {
        "type": "decimal",
        "required": true
      },
      "approvedByDecisionId": {
        "type": "objectId",
        "required": true
      },
      "disbursedTotal": {
        "type": "decimal",
        "required": true,
        "default": 0
      },
      "settlementDueAt": {
        "type": "datetime"
      },
      "settlementSubmittedAt": {
        "type": "datetime"
      },
      "isSettlementLate": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "acceptedTotal": {
        "type": "decimal"
      },
      "settlementBalance": {
        "type": "decimal"
      },
      "recoveryAmount": {
        "type": "decimal"
      },
      "recoveryDueAt": {
        "type": "datetime"
      },
      "refundedTotal": {
        "type": "decimal",
        "required": true,
        "default": 0
      },
      "state": {
        "type": "eventBudgetState",
        "required": true,
        "default": "Approved"
      },
      "periodCode": {
        "type": "string"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_budget_club_state"
      }
    ]
  },
  "budgetDisbursements": {
    "fields": {
      "eventBudgetId": {
        "type": "objectId",
        "required": true
      },
      "kind": {
        "type": "budgetFlowKind",
        "required": true,
        "default": "Advance"
      },
      "amount": {
        "type": "decimal",
        "required": true
      },
      "disbursedAt": {
        "type": "datetime",
        "required": true
      },
      "paymentReference": {
        "type": "string"
      },
      "recordedBy": {
        "type": "objectId",
        "required": true
      },
      "note": {
        "type": "string"
      }
    },
    "indexes": [
      {
        "fields": [
          "eventBudgetId"
        ],
        "name": "ix_disb_budget"
      }
    ]
  },
  "expenses": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "eventBudgetId": {
        "type": "objectId",
        "required": true
      },
      "eventId": {
        "type": "objectId",
        "required": true
      },
      "category": {
        "type": "string",
        "required": true
      },
      "amount": {
        "type": "decimal",
        "required": true
      },
      "spentAt": {
        "type": "datetime",
        "required": true
      },
      "description": {
        "type": "text"
      },
      "isOutOfCategory": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "isOverRemaining": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "hasEvidence": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "reviewOutcome": {
        "type": "expenseReviewOutcome"
      },
      "reviewReason": {
        "type": "text"
      },
      "recordedBy": {
        "type": "objectId",
        "required": true
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "eventBudgetId",
          "category"
        ],
        "name": "ix_expense_budget"
      },
      {
        "fields": [
          "clubId",
          "spentAt"
        ],
        "name": "ix_expense_club_period"
      },
      {
        "fields": [
          "eventBudgetId",
          "hasEvidence"
        ],
        "name": "ix_expense_unsupported"
      }
    ]
  },
  "financialEvidences": {
    "fields": {
      "expenseId": {
        "type": "objectId",
        "required": true
      },
      "type": {
        "type": "string",
        "required": true
      },
      "externalLink": {
        "type": "string",
        "required": true
      },
      "uploadedBy": {
        "type": "objectId",
        "required": true
      },
      "uploadedAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "expenseId"
        ],
        "name": "ix_evidence_expense"
      }
    ]
  },
  "financialReconciliations": {
    "fields": {
      "eventBudgetId": {
        "type": "objectId",
        "unique": true,
        "required": true
      },
      "approvedTotal": {
        "type": "decimal",
        "required": true
      },
      "disbursedTotal": {
        "type": "decimal",
        "required": true
      },
      "recordedTotal": {
        "type": "decimal",
        "required": true
      },
      "supportedTotal": {
        "type": "decimal",
        "required": true
      },
      "unsupportedTotal": {
        "type": "decimal",
        "required": true
      },
      "remaining": {
        "type": "decimal",
        "required": true
      },
      "acceptedTotal": {
        "type": "decimal",
        "required": true
      },
      "settlementBalance": {
        "type": "decimal",
        "required": true
      },
      "outcome": {
        "type": "string",
        "required": true
      },
      "isOverdueSettlement": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "computedAt": {
        "type": "datetime",
        "required": true
      },
      "closedBy": {
        "type": "objectId"
      },
      "closedAt": {
        "type": "datetime"
      }
    },
    "indexes": []
  },
  "properties": {
    "fields": {
      "code": {
        "type": "string",
        "unique": true,
        "required": true
      },
      "name": {
        "type": "string",
        "required": true
      },
      "type": {
        "type": "string",
        "required": true
      },
      "capacity": {
        "type": "int"
      },
      "location": {
        "type": "string"
      },
      "equipment": {
        "type": "string[]"
      },
      "bookableHours": {
        "type": "json",
        "required": true
      },
      "blackouts": {
        "type": "json"
      },
      "propertyClass": {
        "type": "string"
      },
      "isActive": {
        "type": "bool",
        "required": true,
        "default": true
      }
    },
    "indexes": [
      {
        "fields": [
          "isActive",
          "type"
        ],
        "name": "ix_property_catalogue"
      }
    ]
  },
  "propertyBookings": {
    "fields": {
      "propertyId": {
        "type": "objectId",
        "required": true
      },
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "clubName": {
        "type": "string",
        "required": true
      },
      "eventId": {
        "type": "objectId"
      },
      "purpose": {
        "type": "text",
        "required": true
      },
      "startAt": {
        "type": "datetime",
        "required": true
      },
      "endAt": {
        "type": "datetime",
        "required": true
      },
      "semesterCode": {
        "type": "string",
        "required": true
      },
      "headcount": {
        "type": "int"
      },
      "state": {
        "type": "bookingState",
        "required": true,
        "default": "Draft"
      },
      "currentVersionNo": {
        "type": "int",
        "required": true,
        "default": 1
      },
      "conflictResult": {
        "type": "conflictResult"
      },
      "decisionReason": {
        "type": "string"
      },
      "decidedBy": {
        "type": "objectId"
      },
      "decidedAt": {
        "type": "datetime"
      },
      "cancelReason": {
        "type": "string"
      },
      "cancelledAt": {
        "type": "datetime"
      },
      "releasedBy": {
        "type": "string"
      },
      "isLateCancellation": {
        "type": "bool",
        "default": false
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "propertyId",
          "startAt",
          "endAt"
        ],
        "name": "ix_booking_slot"
      },
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_booking_club_state"
      },
      {
        "fields": [
          "state",
          "startAt"
        ],
        "name": "ix_booking_schedule"
      }
    ]
  },
  "eventFeedbacks": {
    "fields": {
      "eventId": {
        "type": "objectId",
        "required": true
      },
      "attendanceId": {
        "type": "objectId",
        "required": true
      },
      "studentId": {
        "type": "objectId",
        "required": true
      },
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "scores": {
        "type": "json",
        "required": true
      },
      "comment": {
        "type": "text"
      },
      "isAnonymous": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "submittedAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "eventId",
          "studentId"
        ],
        "unique": true,
        "name": "uq_feedback"
      },
      {
        "fields": [
          "clubId",
          "submittedAt"
        ],
        "name": "ix_feedback_club"
      }
    ]
  },
  "complaints": {
    "fields": {
      "complainantId": {
        "type": "objectId",
        "required": true
      },
      "recipient": {
        "type": "feedbackRecipient",
        "required": true,
        "default": "CLUB"
      },
      "clubId": {
        "type": "objectId"
      },
      "eventId": {
        "type": "objectId"
      },
      "type": {
        "type": "string",
        "required": true
      },
      "description": {
        "type": "text",
        "required": true
      },
      "isAnonymous": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "evidence": {
        "type": "json"
      },
      "state": {
        "type": "complaintState",
        "required": true,
        "default": "Submitted"
      },
      "triage": {
        "type": "json"
      },
      "clubResponse": {
        "type": "json"
      },
      "responseDueAt": {
        "type": "datetime"
      },
      "violationId": {
        "type": "objectId"
      },
      "linkedComplaintId": {
        "type": "objectId"
      },
      "submittedAt": {
        "type": "datetime",
        "required": true
      },
      "withdrawnAt": {
        "type": "datetime"
      },
      "closedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "state",
          "submittedAt"
        ],
        "name": "ix_complaint_queue"
      },
      {
        "fields": [
          "clubId",
          "state"
        ],
        "name": "ix_complaint_club"
      },
      {
        "fields": [
          "complainantId",
          "state"
        ],
        "name": "ix_complaint_mine"
      },
      {
        "fields": [
          "recipient",
          "clubId",
          "submittedAt"
        ],
        "name": "ix_complaint_inbox"
      }
    ]
  },
  "evaluationSchemes": {
    "fields": {
      "periodCode": {
        "type": "string",
        "required": true
      },
      "version": {
        "type": "int",
        "required": true
      },
      "state": {
        "type": "string",
        "required": true
      },
      "totalWeight": {
        "type": "decimal",
        "required": true
      },
      "thresholds": {
        "type": "json",
        "required": true
      },
      "activatedBy": {
        "type": "objectId"
      },
      "activatedAt": {
        "type": "datetime"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "periodCode",
          "version"
        ],
        "unique": true,
        "name": "uq_scheme"
      }
    ]
  },
  "evaluationDimensions": {
    "fields": {
      "schemeId": {
        "type": "objectId",
        "required": true
      },
      "code": {
        "type": "string",
        "required": true
      },
      "name": {
        "type": "string",
        "required": true
      },
      "weight": {
        "type": "decimal",
        "required": true
      },
      "scoringRule": {
        "type": "json",
        "required": true
      },
      "allowsManual": {
        "type": "bool",
        "required": true,
        "default": false
      }
    },
    "indexes": [
      {
        "fields": [
          "schemeId",
          "code"
        ],
        "unique": true,
        "name": "uq_dimension"
      }
    ]
  },
  "evaluations": {
    "fields": {
      "clubId": {
        "type": "objectId",
        "required": true
      },
      "periodCode": {
        "type": "string",
        "required": true
      },
      "schemeId": {
        "type": "objectId",
        "required": true
      },
      "state": {
        "type": "evaluationState",
        "required": true,
        "default": "Draft"
      },
      "totalScore": {
        "type": "decimal"
      },
      "classification": {
        "type": "string"
      },
      "revisionNo": {
        "type": "int",
        "required": true,
        "default": 1
      },
      "generatedAt": {
        "type": "datetime"
      },
      "finalizedBy": {
        "type": "objectId"
      },
      "finalizedAt": {
        "type": "datetime"
      },
      "publishedAt": {
        "type": "datetime"
      },
      "contestViolationId": {
        "type": "objectId"
      }
    },
    "indexes": [
      {
        "fields": [
          "clubId",
          "periodCode",
          "revisionNo"
        ],
        "unique": true,
        "name": "uq_evaluation"
      },
      {
        "fields": [
          "periodCode",
          "state"
        ],
        "name": "ix_evaluation_period"
      }
    ]
  },
  "evaluationDimensionResults": {
    "fields": {
      "evaluationId": {
        "type": "objectId",
        "required": true
      },
      "dimensionCode": {
        "type": "string",
        "required": true
      },
      "score": {
        "type": "decimal"
      },
      "isInsufficientData": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "isManual": {
        "type": "bool",
        "required": true,
        "default": false
      },
      "justification": {
        "type": "text"
      },
      "evidence": {
        "type": "json",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "evaluationId",
          "dimensionCode"
        ],
        "unique": true,
        "name": "uq_dimresult"
      }
    ]
  },
  "approvalTasks": {
    "fields": {
      "entityType": {
        "type": "string",
        "required": true
      },
      "entityId": {
        "type": "objectId",
        "required": true
      },
      "clubId": {
        "type": "objectId"
      },
      "title": {
        "type": "string",
        "required": true
      },
      "state": {
        "type": "approvalTaskState",
        "required": true,
        "default": "Open"
      },
      "assigneeId": {
        "type": "objectId"
      },
      "slaDueAt": {
        "type": "datetime"
      },
      "openedAt": {
        "type": "datetime",
        "required": true
      },
      "closedAt": {
        "type": "datetime"
      }
    },
    "indexes": [
      {
        "fields": [
          "entityType",
          "entityId"
        ],
        "name": "ix_task_entity"
      },
      {
        "fields": [
          "state",
          "assigneeId",
          "slaDueAt"
        ],
        "name": "ix_task_inbox"
      }
    ]
  },
  "approvalDecisions": {
    "fields": {
      "approvalTaskId": {
        "type": "objectId",
        "required": true
      },
      "outcome": {
        "type": "reviewOutcome",
        "required": true
      },
      "reason": {
        "type": "text"
      },
      "comments": {
        "type": "json"
      },
      "reviewNote": {
        "type": "text"
      },
      "actorId": {
        "type": "objectId",
        "required": true
      },
      "at": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "approvalTaskId"
        ],
        "unique": true,
        "name": "uq_decision_task"
      }
    ]
  },
  "notifications": {
    "fields": {
      "recipientUserId": {
        "type": "objectId",
        "required": true
      },
      "eventCode": {
        "type": "string",
        "required": true
      },
      "entityType": {
        "type": "string"
      },
      "entityId": {
        "type": "objectId"
      },
      "channels": {
        "type": "string[]",
        "required": true
      },
      "payload": {
        "type": "json",
        "required": true
      },
      "state": {
        "type": "notificationState",
        "required": true,
        "default": "Queued"
      },
      "dueAt": {
        "type": "datetime",
        "required": true
      },
      "attempts": {
        "type": "int",
        "required": true,
        "default": 0
      },
      "lastError": {
        "type": "string"
      },
      "readAt": {
        "type": "datetime"
      },
      "createdAt": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "state",
          "dueAt"
        ],
        "name": "ix_outbox_drain"
      },
      {
        "fields": [
          "recipientUserId",
          "readAt"
        ],
        "name": "ix_notification_inbox"
      }
    ]
  },
  "emailDeliveryLogs": {
    "fields": {
      "notificationId": {
        "type": "objectId",
        "required": true
      },
      "toEmail": {
        "type": "string",
        "required": true
      },
      "status": {
        "type": "string",
        "required": true
      },
      "attempt": {
        "type": "int",
        "required": true
      },
      "providerResponse": {
        "type": "string"
      },
      "at": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "notificationId"
        ],
        "name": "ix_maillog_notification"
      }
    ]
  },
  "auditLogs": {
    "fields": {
      "entityType": {
        "type": "string",
        "required": true
      },
      "entityId": {
        "type": "objectId",
        "required": true
      },
      "action": {
        "type": "string",
        "required": true
      },
      "actorId": {
        "type": "objectId"
      },
      "actorRole": {
        "type": "string"
      },
      "before": {
        "type": "json"
      },
      "after": {
        "type": "json"
      },
      "changeDiff": {
        "type": "json"
      },
      "reason": {
        "type": "string"
      },
      "correlationId": {
        "type": "string",
        "required": true
      },
      "at": {
        "type": "datetime",
        "required": true
      }
    },
    "indexes": [
      {
        "fields": [
          "entityType",
          "entityId",
          "at"
        ],
        "name": "ix_audit_entity"
      },
      {
        "fields": [
          "correlationId"
        ],
        "name": "ix_audit_correlation"
      },
      {
        "fields": [
          "actorId",
          "at"
        ],
        "name": "ix_audit_actor"
      }
    ]
  }
} as const;
