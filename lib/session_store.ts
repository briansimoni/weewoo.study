import { getKv } from "./kv.ts";

export interface Session {
  session_id: string;
  user_id?: string;
  access_token?: string;
  nickname?: string;
  name?: string;
  picture?: string;
  display_name?: string;
  streakDays?: number;
  [key: string]: any;
}

export class SessionStore {
  private constructor(private kv: Deno.Kv) {}

  static async make(kv?: Deno.Kv) {
    if (!kv) {
      kv = await getKv();
    }
    return new SessionStore(kv);
  }

  /**
   * get will get the streak object and it will also purge it from the database if it's expired.
   * Deno kv's expireIn seems sus. Plus the documentation says that it's not guaranteed to get
   * removed from the database the moment it expires.
   */
  async get(id: string) {
    const session = (await this.kv.get<Session>(["sessions", id])).value;
    return session;
  }

  // handles basically all of the logic for updating the streak
  // creates the object if it isn't there and increments the streak if updated
  // during a certain time frame. Otherwise it will be a noop and return current streak
  async update(session: Session) {
    let existingSession = null;
    if (session.session_id) {
      existingSession =
        (await this.kv.get<Session>(["sessions", session.session_id])).value;
    }
    const update = {
      ...existingSession,
      ...session,
    };
    await this.kv.set(["sessions", session.session_id], update, {
      expireIn: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
    return update;
  }

  async delete(session_id: string) {
    await this.kv.delete(["sessions", session_id]);
  }

  closeConnection() {
    this.kv.close();
  }
}
