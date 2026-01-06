/**
 * Offline Queue Manager
 * Handles offline data storage and sync for PWA functionality
 */

import { get, set, del, keys } from "idb-keyval";

interface QueuedItem {
    id: string;
    type: "application" | "grievance" | "consent" | "audit";
    data: Record<string, unknown>;
    created_at: string;
    retry_count: number;
    last_retry?: string;
}

interface SyncResult {
    success: boolean;
    synced_count: number;
    failed_count: number;
    errors: string[];
}

/**
 * Offline Queue Manager
 * Stores pending operations when offline and syncs when back online
 */
export class OfflineQueue {
    private readonly QUEUE_KEY = "offline_queue";
    private readonly MAX_RETRIES = 3;

    /**
     * Add item to offline queue
     */
    async enqueue(type: QueuedItem["type"], data: Record<string, unknown>): Promise<string> {
        const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const item: QueuedItem = {
            id,
            type,
            data,
            created_at: new Date().toISOString(),
            retry_count: 0,
        };

        const queue = await this.getQueue();
        queue.push(item);
        await set(this.QUEUE_KEY, queue);

        return id;
    }

    /**
     * Get all queued items
     */
    async getQueue(): Promise<QueuedItem[]> {
        const queue = await get<QueuedItem[]>(this.QUEUE_KEY);
        return queue || [];
    }

    /**
     * Get queued items by type
     */
    async getQueueByType(type: QueuedItem["type"]): Promise<QueuedItem[]> {
        const queue = await this.getQueue();
        return queue.filter(item => item.type === type);
    }

    /**
     * Remove item from queue
     */
    async dequeue(id: string): Promise<boolean> {
        const queue = await this.getQueue();
        const index = queue.findIndex(item => item.id === id);

        if (index === -1) return false;

        queue.splice(index, 1);
        await set(this.QUEUE_KEY, queue);
        return true;
    }

    /**
     * Update item in queue (e.g., increment retry count)
     */
    async updateItem(id: string, updates: Partial<QueuedItem>): Promise<boolean> {
        const queue = await this.getQueue();
        const index = queue.findIndex(item => item.id === id);

        if (index === -1) return false;

        queue[index] = { ...queue[index], ...updates };
        await set(this.QUEUE_KEY, queue);
        return true;
    }

    /**
     * Get queue size
     */
    async getQueueSize(): Promise<number> {
        const queue = await this.getQueue();
        return queue.length;
    }

    /**
     * Check if queue has pending items
     */
    async hasPendingItems(): Promise<boolean> {
        const size = await this.getQueueSize();
        return size > 0;
    }

    /**
     * Clear all queued items
     */
    async clearQueue(): Promise<void> {
        await del(this.QUEUE_KEY);
    }

    /**
     * Sync all queued items with server
     */
    async syncAll(
        syncHandler: (item: QueuedItem) => Promise<boolean>
    ): Promise<SyncResult> {
        const queue = await this.getQueue();

        const result: SyncResult = {
            success: true,
            synced_count: 0,
            failed_count: 0,
            errors: [],
        };

        for (const item of queue) {
            try {
                const success = await syncHandler(item);

                if (success) {
                    await this.dequeue(item.id);
                    result.synced_count++;
                } else {
                    await this.handleSyncFailure(item);
                    result.failed_count++;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`${item.id}: ${errorMessage}`);
                await this.handleSyncFailure(item);
                result.failed_count++;
            }
        }

        result.success = result.failed_count === 0;
        return result;
    }

    /**
     * Handle sync failure (increment retry count or remove if max retries reached)
     */
    private async handleSyncFailure(item: QueuedItem): Promise<void> {
        if (item.retry_count >= this.MAX_RETRIES) {
            // Move to dead letter queue
            await this.moveToDeadLetter(item);
            await this.dequeue(item.id);
        } else {
            await this.updateItem(item.id, {
                retry_count: item.retry_count + 1,
                last_retry: new Date().toISOString(),
            });
        }
    }

    /**
     * Move failed item to dead letter storage
     */
    private async moveToDeadLetter(item: QueuedItem): Promise<void> {
        const deadLetterKey = "dead_letter_queue";
        const deadLetter = await get<QueuedItem[]>(deadLetterKey) || [];
        deadLetter.push(item);
        await set(deadLetterKey, deadLetter);
    }
}

/**
 * Session Storage Manager
 * Handles session-scoped data storage
 */

interface SessionData {
    id: string;
    language: string;
    started_at: string;
    last_activity: string;
    jan_aadhaar_id?: string;
    current_step?: string;
    form_data?: Record<string, unknown>;
}

export class SessionStorage {
    private readonly SESSION_KEY = "current_session";

    /**
     * Start new session
     */
    async startSession(language: string = "hi"): Promise<string> {
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const session: SessionData = {
            id: sessionId,
            language,
            started_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
        };

        await set(this.SESSION_KEY, session);
        return sessionId;
    }

    /**
     * Get current session
     */
    async getSession(): Promise<SessionData | null> {
        const session = await get<SessionData>(this.SESSION_KEY);
        return session || null;
    }

    /**
     * Update session data
     */
    async updateSession(updates: Partial<SessionData>): Promise<boolean> {
        const session = await this.getSession();
        if (!session) return false;

        const updated: SessionData = {
            ...session,
            ...updates,
            last_activity: new Date().toISOString(),
        };

        await set(this.SESSION_KEY, updated);
        return true;
    }

    /**
     * End session
     */
    async endSession(): Promise<void> {
        await del(this.SESSION_KEY);
    }

    /**
     * Check if session is active (within last 30 minutes)
     */
    async isSessionActive(): Promise<boolean> {
        const session = await this.getSession();
        if (!session) return false;

        const lastActivity = new Date(session.last_activity);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

        return diffMinutes < 30;
    }

    /**
     * Store form data in progress
     */
    async saveFormData(data: Record<string, unknown>): Promise<void> {
        await this.updateSession({ form_data: data });
    }

    /**
     * Get form data in progress
     */
    async getFormData(): Promise<Record<string, unknown> | null> {
        const session = await this.getSession();
        return session?.form_data || null;
    }
}

/**
 * Online Status Manager
 * Monitors network connectivity and triggers sync
 */
export class OnlineStatusManager {
    private isOnline: boolean = true;
    private listeners: Set<(online: boolean) => void> = new Set();

    constructor() {
        if (typeof window !== "undefined") {
            this.isOnline = navigator.onLine;

            window.addEventListener("online", () => this.handleOnline());
            window.addEventListener("offline", () => this.handleOffline());
        }
    }

    private handleOnline(): void {
        this.isOnline = true;
        this.notifyListeners(true);
    }

    private handleOffline(): void {
        this.isOnline = false;
        this.notifyListeners(false);
    }

    private notifyListeners(online: boolean): void {
        this.listeners.forEach(listener => listener(online));
    }

    /**
     * Add listener for online status changes
     */
    addListener(callback: (online: boolean) => void): void {
        this.listeners.add(callback);
    }

    /**
     * Remove listener
     */
    removeListener(callback: (online: boolean) => void): void {
        this.listeners.delete(callback);
    }

    /**
     * Check if currently online
     */
    getStatus(): boolean {
        return this.isOnline;
    }
}

// Export singletons
export const offlineQueue = new OfflineQueue();
export const sessionStorage = new SessionStorage();
export const onlineStatusManager = new OnlineStatusManager();
