// lib/types/scheduling.ts

// =====================================================
// ENUMS
// =====================================================

export enum CallType {
  DISCOVERY = "DISCOVERY",
  ORIENTATION = "ORIENTATION",
  PROGRESS_REVIEW = "PROGRESS_REVIEW",
  RENEWAL = "RENEWAL",
}

export enum CallStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  NOT_PICKED = "NOT_PICKED",
  MISSED_BY_AM = "MISSED_BY_AM",
  RESCHEDULED = "RESCHEDULED",
}

export enum CallPriority {
  RENEWAL = 1,
  DISCOVERY = 2,
  PROGRESS_REVIEW = 3,
  ORIENTATION = 4,
}

export enum ServiceStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ClientSentiment {
  HAPPY = "happy",
  NEUTRAL = "neutral",
  FRUSTRATED = "frustrated",
}

export enum AMUnavailabilityReason {
  SICK_LEAVE = "sick_leave",
  VACATION = "vacation",
  PERSONAL = "personal",
  ON_CALL = "on_call",
  TRAINING = "training",
}

export enum SubscriptionCycle {
  THIRTY_DAYS = "30_days",
  SIXTY_DAYS = "60_days",
  NINETY_DAYS = "90_days",
  ONE_TWENTY_DAYS = "120_days",
  ONE_MONTH = "1_month",
  THREE_MONTHS = "3_months",
  SIX_MONTHS = "6_months",
  ONE_YEAR = "1_year",
  CUSTOM = "custom",
}

// =====================================================
// INTERFACES
// =====================================================

export interface ServiceRegistry {
  id: string;
  lead_id: string;
  sales_closure_id: string;
  service_start_date: string; // ISO timestamp
  subscription_cycle: number; // Days
  renewal_date: string; // Calculated: service_start_date + subscription_cycle
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
}

export interface CallEvent {
  id: string;
  service_registry_id?: string;
  lead_id: string;
  call_type: CallType;
  priority: CallPriority;
  status: CallStatus;

  // Scheduling
  am_id?: string;
  scheduled_at?: string; // ISO timestamp
  scheduled_until?: string; // ISO timestamp
  sla_deadline: string; // ISO timestamp
  renewal_date?: string; // ISO timestamp - For RENEWAL calls, the actual renewal date

  // Metadata
  trigger_event?: string;
  trigger_time?: string;
  progress_day?: number; // For PROGRESS_REVIEW
  preempted_from_id?: string;
  metadata?: Record<string, any>;
  retry_count: number;
  max_retries: number;

  // Feedback
  client_rating?: number; // 1-5
  client_comment?: string;
  am_notes?: string;
  client_sentiment?: ClientSentiment;
  next_action?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface AccountManager {
  id: bigint;
  user_id: string;
  full_name: string;
  user_email: string;
  is_active: string; // "true" or "false"
  roles: string;
  activeClientsCount?: number;
  nearestRenewalDate?: string;
}

export interface TimeSlot {
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  available: boolean;
  amId?: string;
  callEventId?: string;
}

export interface AMUnavailability {
  id: string;
  am_id: string;
  unavailable_date: string; // YYYY-MM-DD
  reason: AMUnavailabilityReason;
  created_at: string;
}

export interface Holiday {
  id: string;
  holiday_date: string; // YYYY-MM-DD
  holiday_name: string;
  created_at: string;
}

export interface SchedulingResult {
  success: boolean;
  message: string;
  callId?: string;
  scheduledDate?: string;
  assignedAM?: string;
  error?: string;
}

export interface RenewalScheduleResult {
  scheduledDate: string; // ISO timestamp
  reason: string;
  success: boolean;
}

export interface ClientSchedulingStatus {
  leadId: string;
  summary: {
    totalCalls: number;
    scheduled: number;
    pending: number;
    completed: number;
    notPicked: number;
  };
  details: Array<{
    id: string;
    type: CallType;
    status: CallStatus;
    priority: string;
    scheduled: {
      date: string | null;
      time: string | null;
      am: string | null;
    };
    slaDeadline: string;
    createdAt: string;
  }>;
}

export interface SchedulingDashboard {
  statistics: {
    pending: number;
    scheduled: number;
    completed: number;
    notPicked: number;
    missedByAM: number;
  };
  clientsNeedingScheduling: Array<{
    leadId: string;
    pendingCallTypes: CallType[];
    count: number;
  }>;
  amWorkload: Array<{
    amId: string;
    amName: string;
    activeClients: number;
    scheduledToday: number;
    completedToday: number;
  }>;
}

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

export interface DiscoveryCallRequest {
  lead_id: string;
  sale_value: number;
  subscription_cycle: number; // Days
  closed_at: string; // ISO timestamp
}

export interface ServiceStartedRequest {
  lead_id: string;
  service_start_date: string; // ISO timestamp
}

export interface CreateCallEventRequest {
  lead_id: string;
  call_type: CallType;
  priority: CallPriority;
  trigger_event: string;
  trigger_time: string;
  sla_deadline: string;
  progress_day?: number;
}

export interface ScheduleCallRequest {
  callId: string;
  amId: string;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
}

export interface AMAvailabilityCheckResult {
  amId: string;
  available: boolean;
  reason?: string;
  activeClientsCount: number;
  scheduledToday: number;
  nearestRenewalDate?: string;
}

export interface SlotCheckResult {
  date: string;
  hasSlot: boolean;
  availableSlots: TimeSlot[];
  amAvailability: AMAvailabilityCheckResult[];
}
