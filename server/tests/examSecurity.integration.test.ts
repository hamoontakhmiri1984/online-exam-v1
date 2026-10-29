            revision: 19,
          })
        ).body.saved,
        false,
      );
      const responses = await Promise.all([
        request(f.exam.id, 'attempts/answers', token, 'PATCH', {
          answers: staleAnswers,
          revision: 21,
        }),
        request(f.exam.id, 'attempts/finish', token, 'POST', {
          answers: finalAnswers,
        }),
        request(f.exam.id, 'attempts/finish', token, 'POST', {
          answers: finalAnswers,
        }),
      ]);
      assert.ok([200, 409].includes(responses[0].status));
      assert.equal(responses[1].status, 200);
      assert.equal(responses[2].status, 200);
      const row = await prisma.examAttempt.findUniqueOrThrow({
        where: {
          examId_studentId: { examId: f.exam.id, studentId: f.student.id },
        },
      });
      assert.deepEqual(row.answers, finalAnswers);
      assert.equal(row.correctCount, 1);
      assert.ok(row.finishedAt);
      assert.equal(
        (
          await request(f.exam.id, 'attempts/answers', token, 'PATCH', {
            answers: staleAnswers,
            revision: 99,
          })
        ).status,
        409,
      );
      const repeated = await request(
        f.exam.id,
        'attempts/finish',
        token,
        'POST',
        { answers: staleAnswers },
      );
      assert.equal(repeated.body.correctCount, 1);
      assert.deepEqual(repeated.body.answers, finalAnswers);
    }
  },
);

test(
  'HTTP attempt start rate limit caps repeated starts per student and exam',
  async (t) => {
    if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');

    const f = await fixture();
    const statuses: number[] = [];
    for (let index = 0; index < 6; index++) {
      const result = await request(
        f.exam.id,
        'attempts/start',
        f.student.accessToken,
        'POST',
        {},
      );
      statuses.push(result.status);
    }

    assert.deepEqual(statuses, [201, 200, 200, 200, 200, 429]);
  },
);

test(
  'Password reset ticket is single-use under concurrency and revokes the existing session',
  async (t) => {
    if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
    const actor = await user('Student');
    const ticket = await signResetTicket(actor.id);
    const passwords = ['Correct-password-A-123', 'Correct-password-B-123'];
    const results = await Promise.allSettled(
      passwords.map((p) => resetPassword(ticket, p)),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const winner = results.findIndex((r) => r.status === 'fulfilled');
    const row = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
    assert.ok(await verifyPassword(passwords[winner], row.passwordHash!));
    assert.equal(await isSessionValid(actor.id, actor.sid), false);
    await assert.rejects(resetPassword(ticket, 'Another-password-123'));
    await assert.rejects(
      resetPassword(actor.accessToken, 'Another-password-123'),
    );
  },
);

test(
  'HTTP attempt audit is paginated and returns stable page metadata',
  async (t) => {
    if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');

    const f = await fixture();
    const extraStudents = [await user('Student'), await user('Student')];
    await prisma.group.update({
      where: { id: f.group.id },
      data: {
        students: {
          connect: extraStudents.map((student) => ({ id: student.id })),
        },
      },
    });

    for (const student of [f.student, ...extraStudents]) {
      const started = await request(
        f.exam.id,
        'attempts/start',
        student.accessToken,
        'POST',
        {},
      );
      assert.ok([200, 201].includes(started.status));
    }

    const first = await request(
      f.exam.id,
      'attempts/audit?page=1&pageSize=1',
      f.teacher.accessToken,
    );
    const second = await request(
      f.exam.id,
      'attempts/audit?page=2&pageSize=1',
      f.teacher.accessToken,
    );

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(first.body.total, 3);
    assert.equal(first.body.page, 1);
    assert.equal(first.body.pageSize, 1);
    assert.equal(first.body.items.length, 1);
    assert.equal(second.body.page, 2);
    assert.equal(second.body.items.length, 1);
    assert.notEqual(first.body.items[0].id, second.body.items[0].id);
  },
);
